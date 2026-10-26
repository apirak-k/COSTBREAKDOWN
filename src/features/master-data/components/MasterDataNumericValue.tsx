import React from 'react'
import { useMasterDataSelectionPending } from '../direct-edit-presentation'
import type { NumericInputProps } from '../../../shared/ui/NumericInput'
import { NumericInput } from '../../../shared/ui/NumericInput'
import { SelectedNumber, useSelectedValue, useSelectedValueSource } from '../../../shared/ui/selected-value'
import { formatBusinessNumber } from '../../../shared/ui/numeric-display'
import { BusinessNumber } from '../../../shared/ui/BusinessNumber'
import { NumericColumnHeader } from '../../../shared/ui/NumericColumnHeader'
import { MasterDataBlockerMarker } from './MasterDataBlockerMarker'

export function masterDataSelectedValueId(
  role: string,
  datasetId: string,
  section: string,
  recordId: string,
  field: string
): string {
  return ['master-data', role, datasetId, section, recordId, field]
    .map(part => encodeURIComponent(part))
    .join(':')
}

interface MasterDataNumericInputProps extends NumericInputProps {
  selectionId: string
  percentage?: boolean
  'data-grid-cell'?: string
}

export function MasterDataNumericInput({ selectionId, percentage = false, ...props }: MasterDataNumericInputProps) {
  const directEditPending = useMasterDataSelectionPending(selectionId) || props.directEditPending
  const { clearFocus } = useSelectedValue()
  const { focus, preview, clearPreview } = useSelectedValueSource({
    value: props.value,
    directEditPending,
    exactValue: props.exactValue,
    editable: true,
    domain: {
      integer: props.integer,
      min: props.min,
      max: props.max,
      minExclusive: props.minExclusive
    },
    percentage,
    onValueChange: props.onValueChange,
    allowSubMinimumDraft: props.allowSubMinimumDraft,
    stopAtMinimum: props.stopAtMinimum
  }, selectionId)

  return (
    <NumericInput
      {...props}
      directEditPending={directEditPending}
      numericColumn={props['data-grid-cell'] === 'true'}
      data-selected-value-source={selectionId}
      onPointerEnter={event => {
        preview()
        props.onPointerEnter?.(event)
      }}
      onPointerLeave={event => {
        clearPreview()
        props.onPointerLeave?.(event)
      }}
      onFocus={event => {
        focus()
        props.onFocus?.(event)
      }}
      onBlur={event => {
        props.onBlur?.(event)
        const header = event.relatedTarget instanceof Element
          ? event.relatedTarget.closest('[data-header-value]')
          : null
        const headerSourceId = header?.querySelector('[data-selected-value-source]')?.getAttribute('data-selected-value-source')
        if (headerSourceId !== selectionId) clearFocus(selectionId)
      }}
    />
  )
}

interface MasterDataSelectedNumberProps {
  value: number | null | undefined
  selectionId: string
  percentage?: boolean
  integer?: boolean
  integerDigits?: number
  className?: string
  tabIndex?: number
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'data-grid-cell'?: string
  'data-grid-row-id'?: string
  'data-grid-field'?: string
  reserveMarker?: boolean
  missingMarker?: boolean
  contentClassName?: string
  unavailableContent?: React.ReactNode
}

export function MasterDataSelectedNumber({
  value,
  selectionId,
  percentage = false,
  integer = false,
  integerDigits = 8,
  className,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'data-grid-cell': gridCell,
  'data-grid-row-id': gridRowId,
  'data-grid-field': gridField,
  reserveMarker = false,
  missingMarker = false,
  contentClassName,
  unavailableContent
}: MasterDataSelectedNumberProps) {
  const directEditPending = useMasterDataSelectionPending(selectionId)
  const displayValue = value != null && Number.isFinite(value) ? formatBusinessNumber(value, { integer, integerDigits }) : unavailableContent ?? '—'
  const hasFiniteValue = value != null && Number.isFinite(value)
  const nonSelectableContent = (
    <>
      <span className={`block w-full min-w-0 text-right ${reserveMarker ? 'pr-6' : ''} ${contentClassName ?? ''}`}>{hasFiniteValue ? <BusinessNumber value={value} integer={integer} integerDigits={integerDigits} /> : displayValue}</span>
      {missingMarker && <MasterDataBlockerMarker />}
    </>
  )
  const gridProps = {
    tabIndex,
    'aria-label': hasFiniteValue && ariaLabel
      ? `${ariaLabel}: ${formatBusinessNumber(value, { integer, integerDigits })}${percentage ? '%' : ''}`
      : ariaLabel,
    'aria-invalid': ariaInvalid,
    'data-grid-cell': gridCell,
    'data-grid-row-id': gridRowId,
    'data-grid-field': gridField
  }

  if (value == null || !Number.isFinite(value)) {
    return <span {...gridProps} className={className}>{nonSelectableContent}</span>
  }

  return (
    <span className={`${directEditPending ? '!text-blue-700' : ''} ${className ?? ''} ${contentClassName ?? ''} ${reserveMarker ? 'pr-6' : ''}`.trim()}>
      <SelectedNumber
        value={value}
        directEditPending={directEditPending}
        integer={integer}
        percentage={percentage}
        selectionId={selectionId}
        className="whitespace-nowrap"
        stopKeyboardPropagation={gridCell !== 'true'}
        {...gridProps}
      >
        <BusinessNumber value={value} integer={integer} integerDigits={integerDigits} />
      </SelectedNumber>
      {missingMarker && <MasterDataBlockerMarker />}
    </span>
  )
}

interface MasterDataFocusedNumberProps {
  value: number | null | undefined
  selectionId: string
  percentage?: boolean
  integer?: boolean
  className?: string
  tabIndex?: number
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'data-grid-cell'?: string
  'data-grid-row-id'?: string
  'data-grid-field'?: string
  reserveMarker?: boolean
  missingMarker?: boolean
}

/** Keep the existing grid cell as the sole focus target while publishing its read-only value. */
export function MasterDataFocusedNumber({
  value,
  selectionId,
  percentage = false,
  integer = false,
  className,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'data-grid-cell': gridCell,
  'data-grid-row-id': gridRowId,
  'data-grid-field': gridField,
  reserveMarker = false,
  missingMarker = false
}: MasterDataFocusedNumberProps) {
  const { clearFocus } = useSelectedValue()
  const directEditPending = useMasterDataSelectionPending(selectionId)
  const { focus, preview, clearPreview } = useSelectedValueSource({ value, directEditPending, editable: false, domain: { integer }, percentage }, selectionId)

  return (
    <span
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      data-grid-cell={gridCell}
      data-grid-row-id={gridRowId}
      data-grid-field={gridField}
      data-selected-value-source={selectionId}
      onPointerEnter={preview}
      onPointerLeave={clearPreview}
      onFocus={focus}
      onBlur={event => {
        const header = event.relatedTarget instanceof Element
          ? event.relatedTarget.closest('[data-header-value]')
          : null
        const headerSourceId = header?.querySelector('[data-selected-value-source]')?.getAttribute('data-selected-value-source')
        if (headerSourceId !== selectionId) clearFocus(selectionId)
      }}
      className={`${className ?? ''} !px-0 ${directEditPending ? '!text-blue-700' : ''}`.trim()}
    >
      <BusinessNumber value={value} integer={integer} numericColumn numericColumnSigned={false} numericColumnReserveEnd={reserveMarker ? 8 : 0} />
      {missingMarker && <MasterDataBlockerMarker />}
    </span>
  )
}

/** Mirror the body shell so suffixes and markers cannot move the column label. */
export function MasterDataNumericColumnHeader({ children, percentage = false }: { children: React.ReactNode; percentage?: boolean }) {
  if (percentage) return <span className="ml-auto flex w-28 min-w-0 items-center gap-1">
    <NumericColumnHeader className="min-w-0 flex-1">{children}</NumericColumnHeader>
    <span aria-hidden="true" className="w-3 shrink-0" />
  </span>
  return <NumericColumnHeader className="ml-auto w-full max-w-[8.5rem]">{children}</NumericColumnHeader>
}
