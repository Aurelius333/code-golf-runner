import { ref } from 'vue'
import { throttle } from 'lodash-es'

const SERVER_URL =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000'
    : 'http://localhost:3000'

function resolvePath(path: string) {
  if (path.startsWith('/')) path = SERVER_URL + path
  return path
}

async function getOrPost(
  isPost: boolean,
  /** @type {string} */ path: string,
  body?: any,
) {
  path = resolvePath(path)
  const res = await fetch(path, {
    method: isPost ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': isPost ? 'application/json' : (undefined as any),
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) {
    let errorMessage = res.statusText + '\n'
    try {
      errorMessage += (await res.json()).message
    } finally {
      throw Error(errorMessage)
    }
  }
  return res.json()
}

export function get(path: string) {
  return getOrPost(false, path)
}

export function post(path: string, body: any) {
  return getOrPost(true, path, body)
}

export function useWebsocket(
  path: string,
  {
    onConnect,
    onMessage,
  }: {
    onConnect?: () => void
    onMessage?: Record<string, (message: any) => void>
  },
) {
  path = resolvePath(path).replace('http', 'ws')

  const isConnected = ref(false)

  let timeout = 100

  let ws: WebSocket

  function send(message: { type: string } & Record<string, any>) {
    ws.send(JSON.stringify(message))
  }

  const disconnected = throttle(() => {
    isConnected.value = false
    console.log('trying to reconnect... ' + timeout)
    setTimeout(() => {
      if (!isConnected.value) {
        ws.close()
        connectWebsocket()
        if (timeout < 2000) timeout += 200
      }
    }, timeout)
  }, 100)
  function connectWebsocket() {
    ws = new WebSocket(path)
    ws.addEventListener('open', () => {
      timeout = Math.min(timeout, 500)
      isConnected.value = true
      console.log('connected')
      if (onConnect) onConnect()
    })
    ws.addEventListener('message', (event) => {
      const { type, ...message } = JSON.parse(event.data)
      console.log({ type, ...message })
      if (onMessage && onMessage[type]) onMessage[type](message)
    })
    ws.addEventListener('close', disconnected)
    ws.addEventListener('error', disconnected)
  }
  connectWebsocket()

  setTimeout(() => {
    if (!isConnected.value) {
      console.log('failed to connect after 4s')
      disconnected()
    }
  }, 4000)

  return { isConnected, send }
}