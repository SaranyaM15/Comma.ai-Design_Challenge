import { useState } from 'react';
import HUDCanvas from './HUDCanvas';
import './App.css';

const SCENARIOS = [
  { label: 'Highway cruise', conf: 96, str: 14, desc: 'Clear conditions, system fully in control.' },
  { label: 'Sharp curve',    conf: 52, str: 68, desc: 'Reduced confidence on tight bend, moderate steering load.' },
  { label: 'Construction',   conf: 22, str: 45, desc: 'Heavy fog state, uncertain lane markings ahead.' },
  { label: 'Take over',      conf: 5,  str: 94, desc: 'Near-zero confidence, steering at its limit.' },
];

export default function App() {
  const [conf, setConf] = useState(96);
  const [str, setStr]   = useState(14);
  const [activeIdx, setActiveIdx] = useState(0);
  const [desc, setDesc] = useState(SCENARIOS[0].desc);

  function pickScenario(s, i) {
    setConf(s.conf);
    setStr(s.str);
    setActiveIdx(i);
    setDesc(s.desc);
  }

  function handleConfSlider(v) {
    setConf(Number(v));
    setActiveIdx(-1);
    setDesc('');
  }

  function handleStrSlider(v) {
    setStr(Number(v));
    setActiveIdx(-1);
    setDesc('');
  }

  const stateLabel = conf > 65 ? 'Clear' : conf > 30 ? 'Hazy' : 'Heavy fog';
  const stateColor = conf > 65 ? '#00c853' : conf > 30 ? '#e8a020' : '#d63030';

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          
          
        </div>
        <div className="header-right">
          <span className="header-tag">Weather HUD</span>
        </div>
      </header>

      <main className="main">
        <div className="device-wrap">
          <div className="device-frame">
            <div className="screen">
              <HUDCanvas confidence={conf} steeringLoad={str} />
            </div>
          </div>
          
        </div>

        <div className="controls">
          <div className="control-block">
            <div className="control-label">scenario</div>
            <div className="scenario-grid">
              {SCENARIOS.map((s, i) => (
                <button
                  key={i}
                  className={`scenario-btn${activeIdx === i ? ' active' : ''}`}
                  onClick={() => pickScenario(s, i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {desc && <p className="scenario-desc">{desc}</p>}
          </div>

          <div className="sliders-row">
            <div className="slider-block">
              <div className="slider-header">
                <span className="control-label">confidence</span>
                <span className="slider-val" style={{ color: stateColor }}>{conf}% · {stateLabel}</span>
              </div>
              <input
                type="range" min="0" max="100" value={conf} step="1"
                className="slider"
                onChange={e => handleConfSlider(e.target.value)}
              />
              <div className="slider-track-labels">
                <span>struggling</span><span>uncertain</span><span>reliable</span>
              </div>
            </div>

            <div className="slider-block">
              <div className="slider-header">
                <span className="control-label">steering load</span>
                <span className="slider-val" style={{ color: str > 75 ? '#d63030' : str > 45 ? '#e8a020' : '#666' }}>
                  {str}% of max torque
                </span>
              </div>
              <input
                type="range" min="0" max="100" value={str} step="1"
                className="slider"
                onChange={e => handleStrSlider(e.target.value)}
              />
              <div className="slider-track-labels">
                <span>low load</span><span>moderate</span><span>at limit</span>
              </div>
            </div>
          </div>

          <div className="legend">
            <div className="legend-item"><span className="legend-dot" style={{ background: '#00c853' }} /><span>clear = system confident</span></div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#e8a020' }} /><span>haze = stay alert</span></div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#d63030' }} /><span>fog = take the wheel</span></div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>Saranya Madala · comma.ai design challenge · 2026</span>
      </footer>
    </div>
  );
}
