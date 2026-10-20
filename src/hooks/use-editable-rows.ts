'use client'
import { useCallback,useState,type Dispatch,type SetStateAction } from 'react'
export function useEditableRows<T>(initial:T[]){
  const [state,setState]=useState({source:initial,rows:initial})
  const rows=state.source===initial?state.rows:initial
  const setRows:Dispatch<SetStateAction<T[]>>=useCallback(next=>setState(previous=>({source:initial,rows:typeof next==='function'?next(previous.source===initial?previous.rows:initial):next})),[initial])
  return [rows,setRows] as const
}
