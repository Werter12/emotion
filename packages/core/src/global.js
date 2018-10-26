// @flow
import * as React from 'react'
import { withEmotionCache, ThemeContext, useContext } from './context'
import { isBrowser, insertStyles } from '@emotion/utils'
import { StyleSheet } from '@emotion/sheet'
import { serializeStyles } from '@emotion/serialize'

type Styles = Object | Array<Object>

type GlobalProps = {
  +styles: Styles | (Object => Styles)
}

let useMemo: <Val>(() => Val, mem?: Array<any>) => Val = (React: any).useMemo

let useMutationEffect: (() => mixed, mem?: Array<any>) => void = (React: any)
  .useMutationEffect

let warnedAboutCssPropForGlobal = false

// maintain place over rerenders.
// initial render from browser, insertBefore context.sheet.tags[0] or if a style hasn't been inserted there yet, appendChild
// initial client-side render from SSR, use place of hydrating tag

export let Global: React.StatelessFunctionalComponent<
  GlobalProps
> = /* #__PURE__ */ withEmotionCache((props: GlobalProps, cache) => {
  if (
    process.env.NODE_ENV !== 'production' &&
    !warnedAboutCssPropForGlobal &&
    // check for className as well since the user is
    // probably using the custom createElement which
    // means it will be turned into a className prop
    // $FlowFixMe I don't really want to add it to the type since it shouldn't be used
    (props.className || props.css)
  ) {
    console.error(
      "It looks like you're using the css prop on Global, did you mean to use the styles prop instead?"
    )
    warnedAboutCssPropForGlobal = true
  }
  let styles = props.styles

  let serialized = serializeStyles(cache.registered, [
    typeof styles === 'function' ? styles(useContext(ThemeContext)) : styles
  ])

  if (isBrowser) {
    let sheet = useMemo(
      () => {
        let sheet = new StyleSheet({
          key: `${cache.key}-global`,
          nonce: cache.sheet.nonce,
          container: cache.sheet.container
        })
        // $FlowFixMe
        let node: HTMLStyleElement | null = document.querySelector(
          `style[data-emotion-${cache.key}="${serialized.name}"]`
        )

        if (node !== null) {
          sheet.tags.push(node)
        }
        if (cache.sheet.tags.length) {
          sheet.before = cache.sheet.tags[0]
        }
        return sheet
      },
      [cache]
    )
    useMutationEffect(
      () => {
        if (serialized.next !== undefined) {
          // insert keyframes
          insertStyles(cache, serialized.next, true)
        }
        cache.insert(``, serialized, sheet, false)
        return () => {
          // if this doesn't exist then it will be null so the style element will be appended
          sheet.before = sheet.tags[0].nextElementSibling
          sheet.flush()
        }
      },
      [serialized, sheet]
    )
    return null
  } else {
    let serializedNames = serialized.name
    let serializedStyles = serialized.styles
    let next = serialized.next
    while (next !== undefined) {
      serializedNames += ' ' + next.name
      serializedStyles += next.styles
      next = next.next
    }

    let rules = cache.insert(
      ``,
      { name: serializedNames, styles: serializedStyles },
      cache.sheet,
      false
    )

    return (
      <style
        {...{
          [`data-emotion-${cache.key}`]: serializedNames,
          dangerouslySetInnerHTML: { __html: rules },
          nonce: cache.sheet.nonce
        }}
      />
    )
  }
})
