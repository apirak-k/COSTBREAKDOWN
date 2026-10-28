//go:build darwin || linux

package main

import (
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestPackageRootForExecutableHandlesMovedPlatformFolders(t *testing.T) {
	tests := []struct {
		name       string
		goos       string
		executable string
		want       string
	}{
		{
			name:       "macOS app bundle",
			goos:       "darwin",
			executable: "/tmp/Cost Breakdown/macOS/Start COSTBREAKDOWN.app/Contents/MacOS/Start COSTBREAKDOWN",
			want:       "/tmp/Cost Breakdown",
		},
		{
			name:       "Linux runtime helper",
			goos:       "linux",
			executable: "/tmp/Cost Breakdown/Linux/runtime/costbreakdown-linux-amd64",
			want:       "/tmp/Cost Breakdown",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := packageRootForExecutable(test.executable, test.goos)
			if err != nil {
				t.Fatalf("packageRootForExecutable() error = %v", err)
			}
			if got != test.want {
				t.Fatalf("packageRootForExecutable() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestResolveStaticFileRestrictsRequestsToAppAndUsesSpaFallback(t *testing.T) {
	appRoot := filepath.ToSlash(t.TempDir())
	if err := os.MkdirAll(filepath.Join(filepath.FromSlash(appRoot), "assets"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(filepath.FromSlash(appRoot), "index.html"), []byte("app entry"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(filepath.FromSlash(appRoot), "assets", "main.css"), []byte("body{}"), 0o600); err != nil {
		t.Fatal(err)
	}

	asset, err := resolveStaticFile(appRoot, "/assets/main.css")
	if err != nil {
		t.Fatalf("resolve existing asset: %v", err)
	}
	if !strings.HasSuffix(filepath.ToSlash(asset), "/assets/main.css") {
		t.Fatalf("resolved asset path = %q", asset)
	}

	route, err := resolveStaticFile(appRoot, "/cost-breakdown")
	if err != nil {
		t.Fatalf("resolve client route: %v", err)
	}
	if !strings.HasSuffix(filepath.ToSlash(route), "/index.html") {
		t.Fatalf("client route should use index.html, got %q", route)
	}
}

func TestResolveStaticFileRejectsTraversal(t *testing.T) {
	appRoot := filepath.ToSlash(t.TempDir())
	if _, err := resolveStaticFile(appRoot, "/../outside.txt"); err == nil {
		t.Fatal("resolveStaticFile() accepted a path outside the shared app directory")
	}
}

func TestInstanceStateMustMatchPackageAndHaveValidControlData(t *testing.T) {
	state := instanceState{
		Version:     1,
		PID:         42,
		Port:        49152,
		Token:       strings.Repeat("a", 64),
		PackageRoot: "/tmp/moved-package",
	}
	if !validInstanceState(state, "/tmp/moved-package") {
		t.Fatal("valid package-scoped state was rejected")
	}
	if validInstanceState(state, "/tmp/other-package") {
		t.Fatal("state from another package was accepted")
	}
	state.Port = 0
	if validInstanceState(state, "/tmp/moved-package") {
		t.Fatal("state with a non-listening port was accepted")
	}
}

func TestHealthRouteRequiresExactInstanceToken(t *testing.T) {
	if !matchesControlToken(strings.Repeat("a", 64), strings.Repeat("a", 64)) {
		t.Fatal("matching health token was rejected")
	}
	if matchesControlToken(strings.Repeat("a", 64), strings.Repeat("b", 64)) {
		t.Fatal("different package token was accepted")
	}
	if matchesControlToken(strings.Repeat("a", 64), "") {
		t.Fatal("empty health token was accepted")
	}
}

func TestControlClientBypassesSystemProxyAndUsesShortConnections(t *testing.T) {
	client := localHTTPClient(time.Second)
	transport, ok := client.Transport.(*http.Transport)
	if !ok {
		t.Fatalf("localHTTPClient() transport has type %T", client.Transport)
	}
	if transport.Proxy != nil {
		t.Fatal("loopback control requests must bypass system proxy configuration")
	}
	if !transport.DisableKeepAlives {
		t.Fatal("loopback control requests should not retain idle connections")
	}
}

func TestStaticHandlerServesAppAndProtectsControlRoutes(t *testing.T) {
	appRoot := filepath.ToSlash(t.TempDir())
	if err := os.WriteFile(filepath.Join(filepath.FromSlash(appRoot), "index.html"), []byte("shared app"), 0o600); err != nil {
		t.Fatal(err)
	}
	state := instanceState{PID: os.Getpid(), Port: 43821, Token: strings.Repeat("c", 64), PackageRoot: appRoot}
	stop := make(chan struct{}, 1)
	handler := staticHandler(appRoot, state, stop)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("GET", "/", nil))
	if response.Code != 200 || response.Body.String() != "shared app" {
		t.Fatalf("app response = %d %q", response.Code, response.Body.String())
	}
	favicon := httptest.NewRecorder()
	handler.ServeHTTP(favicon, httptest.NewRequest("GET", "/favicon.ico", nil))
	if favicon.Code != 204 {
		t.Fatalf("favicon status = %d, want 204", favicon.Code)
	}

	denied := httptest.NewRecorder()
	handler.ServeHTTP(denied, httptest.NewRequest("GET", "/__costbreakdown_stop?token=wrong", nil))
	if denied.Code != 404 {
		t.Fatalf("wrong stop token status = %d, want 404", denied.Code)
	}

	accepted := httptest.NewRecorder()
	handler.ServeHTTP(accepted, httptest.NewRequest("GET", "/__costbreakdown_stop?token="+state.Token, nil))
	if accepted.Code != 202 {
		t.Fatalf("stop status = %d, want 202", accepted.Code)
	}
	select {
	case <-stop:
	default:
		t.Fatal("authorized stop route did not request shutdown")
	}
}

func TestListenerUsesOnlyIPv4LoopbackAndSelectsAvailablePort(t *testing.T) {
	listener, err := listenLoopback()
	if err != nil {
		t.Fatalf("listenLoopback() error = %v", err)
	}
	defer listener.Close()

	address, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("listener address has type %T", listener.Addr())
	}
	if !address.IP.Equal(net.ParseIP("127.0.0.1")) {
		t.Fatalf("listener bound to %s, want 127.0.0.1", address.IP)
	}
	if address.Port == 0 {
		t.Fatal("listener did not receive an available port")
	}
}
