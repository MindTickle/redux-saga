import * as is from '@redux-saga/is'
import { check, assignWithSymbols, createSetContextWarning } from './utils'
import { stdChannel } from './channel'
import { runSaga } from './runSaga'

export default function sagaMiddlewareFactory({ context = {}, channel = stdChannel(), sagaMonitor, ...options } = {}) {
  let _dispatch
  let _getState

  if (process.env.NODE_ENV !== 'production') {
    check(channel, is.channel, 'options.channel passed to the Saga middleware is not a channel')
  }
  const createWrappedDispatch = (baseDispatch, props, { namespaceKeyGenerator } = {}) => {
    return namespaceKeyGenerator
      ? action => {
          const _action = {
            ...action,
            meta: {
              ...(action.meta || {}),
              namespaceKey: namespaceKeyGenerator(props),
            },
          }
          baseDispatch(_action)
        }
      : baseDispatch
  }

  function sagaMiddleware({ getState, dispatch }) {
    _dispatch = dispatch
    _getState = getState
    return next => action => {
      if (sagaMonitor && sagaMonitor.actionDispatched) {
        sagaMonitor.actionDispatched(action)
      }
      const result = next(action)
      channel.put(action)
      return result
    }
  }

  sagaMiddleware.run = (saga, props = {}, params) => {
    return runSaga(
      {
        ...options,
        context,
        channel,
        dispatch: createWrappedDispatch(_dispatch, props, params),
        getState: _getState,
        sagaMonitor,
      },
      saga,
      props,
    )
  }

  sagaMiddleware.setContext = props => {
    if (process.env.NODE_ENV !== 'production') {
      check(props, is.object, createSetContextWarning('sagaMiddleware', props))
    }

    assignWithSymbols(context, props)
  }

  return sagaMiddleware
}
