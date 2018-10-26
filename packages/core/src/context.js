// @flow
import { isBrowser, type EmotionCache } from '@emotion/utils'
import * as React from 'react'
import createCache from '@emotion/cache'

let EmotionCacheContext = React.createContext(isBrowser ? createCache() : null)

export let useContext: <Value>(
  context: React$Context<Value>
) => Value = (React: any).useContext

export let useState: <State>(
  initialState: (() => State) | State
) => [State, (State) => void] = (React: any).useState

export let ThemeContext = React.createContext<Object>({})
export let CacheProvider: React.ComponentType<{ value: EmotionCache }> =
  // $FlowFixMe
  EmotionCacheContext.Provider

let forwardRef: <Props>(
  render: (props: Props, ref: any) => React.Node
) => React.StatelessFunctionalComponent<Props> = (React: any).forwardRef

let withEmotionCache = function withEmotionCache<Props, Ref: React.Ref<*>>(
  func: (props: Props, cache: EmotionCache, ref: Ref) => React.Node
): React.StatelessFunctionalComponent<Props> {
  return forwardRef((props: Props, ref: Ref) => {
    // $FlowFixMe
    let cache: EmotionCache = useContext(EmotionCacheContext)

    return func(props, cache, ref)
  })
}

if (!isBrowser) {
  withEmotionCache = function withEmotionCache<Props>(
    func: (props: Props, cache: EmotionCache) => React.Node
  ): React.StatelessFunctionalComponent<Props> {
    return (props: Props) => {
      let cache = useContext(EmotionCacheContext)
      if (cache === null) {
        let [state] = useState(createCache)
        return (
          <EmotionCacheContext.Provider value={state}>
            {func(props, state)}
          </EmotionCacheContext.Provider>
        )
      } else {
        return func(props, cache)
      }
    }
  }
}

export { withEmotionCache }
