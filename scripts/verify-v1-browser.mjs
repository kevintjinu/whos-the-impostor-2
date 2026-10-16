import http from 'node:http'
import fs from 'node:fs/promises'

const allScenarios = [
  { width: 320, height: 568, count: 12, mode: 'double-trouble', scoring: 'competitive', rounds: '5', play: 5 },
  { width: 375, height: 667, count: 3, mode: 'chaos', scoring: 'casual', rounds: '5', play: 5 },
  { width: 390, height: 844, count: 4, mode: 'close-call', scoring: 'competitive', rounds: '10', play: 10, enlarged: true },
  { width: 430, height: 932, count: 6, mode: 'double-trouble', scoring: 'casual', rounds: 'endless', play: 3 },
  { width: 600, height: 760, count: 5, mode: 'no-clue', scoring: 'competitive', rounds: 'endless', play: 2 },
  { width: 768, height: 1024, count: 8, mode: 'double-trouble', scoring: 'competitive', rounds: '10', play: 2 },
  { width: 820, height: 1180, count: 9, mode: 'chaos', scoring: 'casual', rounds: '5', play: 1, enlarged: true },
  { width: 1024, height: 1366, count: 10, mode: 'no-clue', scoring: 'casual', rounds: '10', play: 1 },
  { width: 1376, height: 1032, count: 11, mode: 'chaos', scoring: 'competitive', rounds: '10', play: 1 },
  { width: 1440, height: 900, count: 12, mode: 'double-trouble', scoring: 'competitive', rounds: '10', play: 2, desktop: true },
  { width: 844, height: 390, count: 7, mode: 'close-call', scoring: 'casual', rounds: 'endless', play: 2 },
]
const viewport = process.argv.find(arg => arg.startsWith('--viewport='))?.split('=')[1]
const scenarios = viewport ? allScenarios.filter(({ width }) => String(width) === viewport)
  : process.argv.includes('--smoke')
  ? allScenarios.filter(({ width }) => width === 375 || width === 430)
  : allScenarios
const appUrl = process.argv.find((arg) => /^https?:\/\//.test(arg)) ?? 'http://127.0.0.1:5175/'
const page = await new Promise((resolve, reject) => {
  const req = http.request('http://127.0.0.1:9340/json/new?about:blank', { method: 'PUT' }, (res) => {
    let body = ''; res.on('data', (data) => { body += data }); res.on('end', () => resolve(JSON.parse(body)))
  }); req.on('error', reject); req.end()
})
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve) => { ws.onopen = resolve })
let commandId = 0
const pending = new Map()
const errors = []
const unexpectedRequests = new Set()
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
  else if (message.method === 'Runtime.exceptionThrown') errors.push('Runtime exception')
  else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push('Console error')
  else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text)
  else if (message.method === 'Network.requestWillBeSent') {
    const url = new URL(message.params.request.url)
    if (url.protocol.startsWith('http') && url.origin !== new URL(appUrl).origin) unexpectedRequests.add(url.origin)
  }
}
function command(method, params = {}) {
  const id = ++commandId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)) }, 15000)
    pending.set(id, (message) => { clearTimeout(timeout); resolve(message) })
  })
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.result?.exceptionDetails) throw new Error('Browser evaluation failed: ' + response.result.exceptionDetails.text)
  if (response.error) throw new Error(response.error.message)
  return response.result.result.value
}
const pause = (ms = 24) => new Promise((resolve) => setTimeout(resolve, ms))
function assert(value, message) { if (!value) throw new Error(message) }
async function click(text, twice = false) {
  assert(await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(${JSON.stringify(text)}))
    if (!b || b.disabled) return false
    b.click(); ${twice ? 'b.click();' : ''} return true
  })()`), `Missing/enabled button: ${text}`)
  await pause()
}
async function keyboardSpace(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await command('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await pause()
}
async function touchScroll(width, height) {
  await evaluate('scrollTo(0, 0)')
  await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: height - 60, id: 1 }] })
  for (let step = 1; step <= 5; step++) {
    await command('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: height - 60 - ((height - 130) * step / 5), id: 1 }] })
  }
  await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pause(100)
  const down = await evaluate('scrollY')
  await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: 70, id: 2 }] })
  for (let step = 1; step <= 5; step++) {
    await command('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: 70 + ((height - 130) * step / 5), id: 2 }] })
  }
  await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pause(100)
  assert(down > 0 && await evaluate('scrollY') < down, 'Touch scroll failed in one direction')
}
async function layout(scenario, label) {
  const m = await evaluate(`({w: innerWidth, h: innerHeight, x: document.documentElement.scrollWidth - document.documentElement.clientWidth, sh: document.documentElement.scrollHeight})`)
  assert(m.w === scenario.width && m.h === scenario.height, `${label}: viewport dimensions not exact`)
  assert(m.x <= 1, `${label}: horizontal overflow ${m.x}`)
  if (m.sh > m.h + 10) {
    if (scenario.desktop) {
      await evaluate('scrollTo(0, 0)')
      await command('Input.dispatchMouseEvent', { type: 'mouseWheel', x: scenario.width / 2, y: scenario.height / 2, deltaX: 0, deltaY: 400 })
      await pause(100)
      const down = await evaluate('scrollY')
      await command('Input.dispatchMouseEvent', { type: 'mouseWheel', x: scenario.width / 2, y: scenario.height / 2, deltaX: 0, deltaY: -400 })
      await pause(100)
      assert(down > 0 && await evaluate('scrollY') < down, 'Desktop wheel scroll failed')
    } else await touchScroll(scenario.width, scenario.height)
  }
}
async function screenshot(name) {
  await evaluate('scrollTo(0, 0)')
  const r = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  await fs.writeFile(`/tmp/v1-${name}.png`, Buffer.from(r.result.data, 'base64'))
}
async function completeReveals(count) {
  const identities = []
  const words = new Set()
  let majorityWord
  let decoyWord = null
  for (let i = 0; i < count; i++) {
    const name = await evaluate(`document.querySelector('.reveal-handoff h1').textContent.replace('Pass the phone to ', '').replace(/\.$/, '')`)
    await click('Use tap or assistive controls')
    const secret = await evaluate(`({role: document.querySelector('#secret-role').textContent, word: document.querySelector('.secret-word').textContent})`)
    if (secret.word !== 'No word') words.add(secret.word)
    if (secret.role === 'Impostor') { identities.push(name); decoyWord = secret.word === 'No word' ? null : secret.word }
    else majorityWord = secret.word
    await click('Hide secret')
    assert(!await evaluate(`document.querySelector('.secret-content') !== null`), 'Secret did not hide')
    await click(i === count - 1 ? 'Finish reveals' : 'I’ve seen my role')
  }
  return { identities, words: [...words], majorityWord, decoyWord }
}
async function privacy(words) {
  const text = await evaluate('document.body.textContent')
  assert(!words.some(word => text.includes(word)), 'Premature secret word disclosure')
}

await command('Page.enable'); await command('Runtime.enable'); await command('Log.enable'); await command('Network.enable')
await command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
await command('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__draws = 0
  const original = crypto.getRandomValues.bind(crypto)
  crypto.getRandomValues = array => { if (array instanceof Uint32Array) window.__draws += array.length; return original(array) }
})()` })

const results = []
for (const scenario of scenarios) {
  await command('Emulation.setDeviceMetricsOverride', { width: scenario.width, height: scenario.height, mobile: !scenario.desktop, deviceScaleFactor: 1 })
  if (scenario.desktop) await command('Emulation.setVisibleSize', { width: scenario.width, height: scenario.height })
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await command('Page.navigate', { url: appUrl })
  await pause(180)
  assert(await evaluate('window.__draws') === 0, 'Round started on initial load')
  if (scenario.enlarged) await evaluate(`document.documentElement.style.fontSize = '125%'`)
  const names = Array.from({ length: scenario.count }, (_, index) => index === 0 ? 'Alexandria Montgomery-J' : `Player ${index + 1}`)
  const scores = Object.fromEntries(names.map(name => [name, 0]))
  await click('Start Game')
  for (const name of names) {
    await evaluate(`(() => {
      const i = document.querySelector('#player-name')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(name)})
      i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.player-form').requestSubmit()
    })()`); await pause(12)
  }
  await click('Continue')
  assert(await evaluate('window.__draws') === 0, 'Setup created a round before Configuration Continue')
  for (const [group, value] of [['game-mode', scenario.mode], ['scoring', scenario.scoring], ['round-count', scenario.rounds]]) {
    await evaluate(`document.querySelector('input[name="${group}"][value="${value}"]').click()`); await pause()
  }
  await click('Continue', true)
  let previousWords = []
  let previousImpostorIds = []
  for (let round = 1; round <= scenario.play; round++) {
    assert(await evaluate(`document.querySelector('.reveal-handoff') !== null`), 'Next round did not begin private reveal')
    assert(!await evaluate(`!!document.querySelector('.secret-content')`), 'Round opened with a visible secret')
    if (round === 1 || round === 2) {
      const draws = await evaluate('window.__draws')
      await click('Leave reveal')
      await layout(scenario, 'returned configuration')
      await click('Continue', true)
      assert(await evaluate('window.__draws') === draws, 'Resuming setup rerolled the round')
    }
    const secret = await completeReveals(scenario.count)
    assert(!previousWords.includes(secret.majorityWord), 'Majority word repeated while unused alternatives exist')
    previousWords.push(secret.majorityWord)
    await click('Begin round')
    await privacy(secret.words)
    const order = await evaluate(`[...document.querySelectorAll('.speaking-order li span:last-child')].map(x=>x.textContent)`)
    assert(order.length === scenario.count && new Set(order).size === scenario.count, 'Speaking order lost a player')
    await click('Continue to Accusation')
    await layout(scenario, 'accusation draft')
    await privacy(secret.words)
    assert(await evaluate(`document.querySelector('.confirm-accusation-button').disabled`), 'Empty selection can lock')
    const rows = await evaluate(`[...document.querySelectorAll('.accusation-option')].map(l=>({name:l.querySelector('span').textContent,id:l.querySelector('input').value}))`)
    const actualImpostorIds = secret.identities.map(name => rows.find(row => row.name === name).id)
    assert(!actualImpostorIds.some(id => previousImpostorIds.includes(id)), 'An actual role ID repeated in adjacent rounds')
    previousImpostorIds = actualImpostorIds
    const progress = await evaluate(`document.querySelector('.eyebrow').textContent`)
    assert(progress.trim() === `Round ${round}${scenario.rounds === 'endless' ? '' : ` of ${scenario.rounds}`}`, 'Round identity/progress is wrong')
    async function select(name) {
      const id = rows.find(row => row.name === name).id
      await evaluate(`document.querySelector('.accusation-option input[value="${id}"]').click()`); await pause()
    }
    // Alternate complete correctness, wrong accusation, and successful final guess.
    const correctAccusation = round % 3 !== 2
    const correctGuess = round % 3 === 0
    const required = scenario.mode === 'double-trouble' ? 2 : 1
    const targets = correctAccusation ? secret.identities : names.filter(name => !secret.identities.includes(name)).slice(0, required)
    await keyboardSpace('.accusation-option input')
    assert(await evaluate(`document.querySelectorAll('.accusation-option input:checked').length`) === 1, 'Keyboard selection failed')
    assert(await evaluate(`getComputedStyle(document.activeElement.closest('.accusation-option')).outlineStyle`) === 'solid', 'Keyboard focus was not visible')
    if (required === 2) await keyboardSpace('.accusation-option input')
    await select(names[0])
    if (required === 1) await select(targets[0])
    else {
      await select(names[0])
      for (const name of targets) await select(name)
      const third = names.find(name => !targets.includes(name))
      await select(third)
      assert(await evaluate(`document.querySelectorAll('.accusation-option input:checked').length`) === 2, 'Third Double Trouble choice was accepted')
    }
    if (scenario.width === 430 && round === 1) await screenshot('draft-phone')
    await click('Back to Clues')
    assert(JSON.stringify(await evaluate(`[...document.querySelectorAll('.speaking-order li span:last-child')].map(x=>x.textContent)`)) === JSON.stringify(order), 'Back changed speaking order')
    await click('Continue to Accusation')
    assert(await evaluate(`document.querySelectorAll('.accusation-option input:checked').length`) === required, 'Draft lost through Back')
    const drawsBefore = await evaluate('window.__draws')
    if (round === 1 && (scenario.width === 390 || scenario.width === 430)) {
      const resized = scenario.width === 390 ? { width: 844, height: 390 } : { width: 430, height: 568 }
      await command('Emulation.setDeviceMetricsOverride', { ...resized, mobile: true, deviceScaleFactor: 1 })
      await pause()
      await layout(resized, 'rotated or shortened viewport')
      assert(await evaluate(`document.querySelectorAll('.accusation-option input:checked').length`) === required, 'Viewport change lost selection')
      await command('Emulation.setDeviceMetricsOverride', { width: scenario.width, height: scenario.height, mobile: true, deviceScaleFactor: 1 })
      await pause()
    }
    await click('Lock & Reveal Impostor', true)
    assert(!await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Back to Clues'))`), 'Revealed endgame still permits Back')
    if (correctAccusation) {
      await privacy(secret.words)
      assert(await evaluate(`document.querySelector('.final-guess') !== null`), 'Correct accusation skipped verbal guess')
      if (scenario.width === 430 && round === 1) await screenshot('guess-phone')
      await layout(scenario, 'final guess')
      await click(correctGuess ? 'Guessed Correctly' : 'Guessed Incorrectly', true)
    } else assert(!await evaluate(`document.querySelector('.final-guess') !== null`), 'Wrong accusation asked for final guess')
    assert(await evaluate(`document.querySelector('.result-majority-word').textContent`) === secret.majorityWord, 'Completed answer wrong')
    assert(await evaluate(`document.querySelector('.result-decoy-word')?.textContent ?? null`) === secret.decoyWord, 'Completed decoy wrong')
    const winningSide = !correctAccusation || correctGuess ? 'impostors' : 'majority'
    const title = await evaluate(`document.querySelector('#accusation-title').textContent`)
    assert(title === (winningSide === 'impostors' ? 'Impostors win.' : 'Majority wins.'), 'Winning side wrong')
    assert(!await evaluate(`document.querySelector('.accusation-option') !== null`), 'Revealed accusation can be edited')
    assert(await evaluate('window.__draws') === drawsBefore, 'Public transitions drew randomness')
    if (scenario.scoring === 'competitive') {
      for (const name of names) if (secret.identities.includes(name) === (winningSide === 'impostors')) scores[name]++
      const displayed = await evaluate(`[...document.querySelectorAll('.leaderboard li')].map(l=>({name:l.querySelector('.score-name').textContent,score:Number(l.lastElementChild.firstChild.textContent.trim())}))`)
      assert(displayed.every(({name,score}) => scores[name] === score), 'Scores duplicated or assigned to wrong side')
    } else assert(!await evaluate(`document.querySelector('.leaderboard') !== null`), 'Casual displayed competitive points')
    await layout(scenario, 'completed result')
    if (scenario.width === 430 && round === 1) await screenshot('result-phone')
    if (scenario.width === 1440 && round === 1) await screenshot('result-desktop')
    if (round < scenario.play) await click('Next Round', true)
  }
  const finiteFinished = Number(scenario.rounds) === scenario.play
  if (finiteFinished) {
    assert((await evaluate(`document.querySelector('.eyebrow').textContent.trim()`)).startsWith('Session complete'), 'Finite session failed to finish at limit')
    assert(!await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Next Round'))`), 'Finite limit permits extra round')
  } else await click('End Game', true)
  assert((await evaluate(`document.querySelector('.eyebrow').textContent.trim()`)).startsWith('Session complete'), 'End Game failed')
  const beforeNewSessionDraws = await evaluate('window.__draws')
  await click('New Session', true)
  assert(await evaluate(`!!document.querySelector('.game-configuration-screen')`), 'New Session did not return to Configuration')
  assert(await evaluate('window.__draws') === beforeNewSessionDraws, 'New Session created a round before Continue')
  assert(!await evaluate(`!!document.querySelector('.secret-content') || !!document.querySelector('.reveal-handoff')`), 'New Session unexpectedly launched a round')
  await click('Continue', true)
  assert(await evaluate(`document.querySelector('.reveal-handoff') !== null`), 'Configuration Continue did not begin neutral Round 1')
  await completeReveals(scenario.count)
  await click('Begin round')
  await click('Continue to Accusation')
  assert((await evaluate(`document.querySelector('.eyebrow').textContent`)).startsWith('Round 1'), 'New Session did not reset progress')
  results.push({ viewport: `${scenario.width}x${scenario.height}`, mode: scenario.mode, scoring: scenario.scoring, players: scenario.count, completedRounds: scenario.play, text125: !!scenario.enlarged, finiteFinished })
  console.log(`Passed ${scenario.width}x${scenario.height}, ${scenario.play} completed round(s)`)
}
assert(errors.length === 0, `Browser error count: ${errors.length}`)
assert(unexpectedRequests.size === 0, 'Unexpected external application requests')
console.log(JSON.stringify({ results, consoleErrors: errors.length, unexpectedExternalRequests: [...unexpectedRequests] }, null, 2))
ws.close()
