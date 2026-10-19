// Parser mínimo para o formato KeyValues (VDF/ACF) em texto da Valve.
export type VdfNode = { [key: string]: string | VdfNode }

export function parseVdf(text: string): VdfNode {
  let i = 0
  const n = text.length

  function skip(): void {
    while (i < n) {
      const c = text[i]
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '﻿') i++
      else if (c === '/' && text[i + 1] === '/') {
        while (i < n && text[i] !== '\n') i++
      } else break
    }
  }

  function readString(): string {
    if (text[i] === '"') {
      i++
      let out = ''
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && i + 1 < n) {
          const e = text[i + 1]
          out += e === 'n' ? '\n' : e === 't' ? '\t' : e
          i += 2
        } else out += text[i++]
      }
      i++
      return out
    }
    const start = i
    while (i < n && !/[\s{}"]/.test(text[i])) i++
    return text.slice(start, i)
  }

  function readObject(): VdfNode {
    const obj: VdfNode = {}
    while (true) {
      skip()
      if (i >= n) return obj
      if (text[i] === '}') {
        i++
        return obj
      }
      const key = readString()
      skip()
      if (text[i] === '{') {
        i++
        obj[key] = readObject()
      } else {
        obj[key] = readString()
      }
    }
  }

  return readObject()
}

/** Busca chave sem diferenciar maiúsculas/minúsculas (ACFs antigos variam). */
export function getKey(node: VdfNode | undefined, key: string): string | VdfNode | undefined {
  if (!node) return undefined
  const k = Object.keys(node).find((x) => x.toLowerCase() === key.toLowerCase())
  return k === undefined ? undefined : node[k]
}
