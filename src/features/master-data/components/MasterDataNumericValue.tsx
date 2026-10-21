import React from 'react'
import type { NumericInputProps } from '../../../shared/ui/NumericInput'
import { NumericInput } from '../../../shared/ui/NumericInput'
import { SelectedNumber, useSelectedValue, useSelectedValueSource } from '../../../shared/ui/selected-value'
import { formatBusinessNumber } from '../../../shared/ui/numeric-display'
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
}

export function MasterDataNumericInput({ selectionId, percentage = false, ...props }: MasterDataNumericInputProps) {
  const { clearFocus } = useSelectedValue()
  const { focus, preview, clearPreview } = useSelectedValueSource({
    value: props.value,
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
  const displayValue = value != null && Number.isFinite(value) ? formatBusinessNumber(value, { integer }) : unavailableContent ?? '—'
  const hasFiniteValue = value != null && Number.isFinite(value)
  const content = (
    <>
      <span className={`block w-full min-w-0 text-right ${reserveMarker ? 'pr-6' : ''} ${contentClassName ?? ''}`}>{displayValue}</span>
      {missingMarker && <MasterDataBlockerMarker />}
    </>
  )
  const gridProps = {
    tabIndex,
    'aria-label': hasFiniteValue && ariaLabel
      ? `${ariaLabel}: ${formatBusinessNumber(value, { integer })}${percentage ? '%' : ''}`
      : ariaLabel,
    'aria-invalid': ariaInvalid,
    'data-grid-cell': gridCell,
    'data-grid-row-id': gridRowId,
    'data-grid-field': gridField
  }

  if (value == null || !Number.isFinite(value)) {
    return <span {...gridProps} className={className}>{content}</span>
  }

  return (
    <SelectedNumber
      value={value}
      integer={integer}
      percentage={percentage}
      selectionId={selectionId}
      className={className}
      stopKeyboardPropagation={gridCell !== 'true'}
      {...gridProps}
    >
      {content}
    </SelectedNumber>
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
  const { focus, preview, clearPreview } = useSelectedValueSource({ value, editable: false, domain: { integer }, percentage }, selectionId)
  const displayValue = value != null && Number.isFinite(value) ? formatBusinessNumber(value, { integer }) : '—'

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
      className={`${reserveMarker ? 'pr-6 ' : ''}${className ?? ''}`.trim()}
    >
      {displayValue}
      {missingMarker && <MasterDataBlockerMarker />}
    </span>
  )
}
