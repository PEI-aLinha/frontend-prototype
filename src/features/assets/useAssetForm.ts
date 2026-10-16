import { useState } from 'react'
import { validateAsset, type AssetFormValues, type Errors } from './assetFormModel'

/** Gestão do estado do formulário com validação no envio. */
export function useAssetForm(initial: AssetFormValues) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState(false)
  const onChange = (v: AssetFormValues) => {
    setValues(v)
    if (touched) setErrors(validateAsset(v))
  }
  const check = () => {
    setTouched(true)
    const e = validateAsset(values)
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const reset = (v: AssetFormValues) => {
    setValues(v)
    setErrors({})
    setTouched(false)
  }
  return { values, errors, onChange, check, reset }
}

