import { useLLMWorld } from './useLLMWorld'
import { GridView } from './components/GridView'
import { ControlPanel } from './components/ControlPanel'
import { LogPanel } from './components/LogPanel'

export default function App() {
  const world = useLLMWorld()

  return (
    <div className="app">
      <header>
        <h1>🤖 LLM World</h1>
        <p>
          Claude explores a 2D grid, reads the word on a door, collects the
          scattered letters that spell it, and unlocks the door. You control
          when it runs.
        </p>
      </header>

      <main>
        <section className="stage">
          <GridView state={world.state} />
        </section>

        <aside className="side">
          <ControlPanel
            state={world.state}
            levelId={world.levelId}
            running={world.running}
            busy={world.busy}
            config={world.config}
            usage={world.usage}
            keyOk={world.keyOk}
            setConfig={world.setConfig}
            start={world.start}
            pause={world.pause}
            step={world.step}
            reset={world.reset}
          />
          <LogPanel log={world.log} />
        </aside>
      </main>
    </div>
  )
}
