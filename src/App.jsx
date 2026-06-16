import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const defaultComponents = [
  { id: 1, name: 'Housing bore', nominal: 50.000, tolerance: 0.025, direction: '+' },
  { id: 2, name: 'Shaft OD',     nominal: 49.950, tolerance: 0.015, direction: '-' },
  { id: 3, name: 'Snap ring',    nominal: 0.000,  tolerance: 0.010, direction: '+' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authMsg, setAuthMsg] = useState('')
  const [comps, setComps] = useState(defaultComponents)
  const [method, setMethod] = useState('wc')
  const [sigma, setSigma] = useState(3)
  const [goalMin, setGoalMin] = useState('')
  const [goalMax, setGoalMax] = useState('')
  const [nextId, setNextId] = useState(4)

  const isPro = false // we'll connect this to Stripe later

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const handleAuth = async () => {
    setAuthMsg('')
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthMsg(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthMsg(error.message)
      else setAuthMsg('Check your email to confirm your account!')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const add = () => {
    if (!user) { setAuthMsg('Sign in to add more components'); return }
    if (!isPro && comps.length >= 3) {
      alert('Free plan: max 3 components.\nUpgrade to Pro for unlimited!')
      return
    }
    setComps(prev => [...prev, { id: nextId, name: `Component ${nextId}`, nominal: 10, tolerance: 0.05, direction: '+' }])
    setNextId(n => n + 1)
  }

  const remove = (id) => setComps(prev => prev.filter(c => c.id !== id))

  const update = (id, field, val) => {
    setComps(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: field === 'direction' ? val : parseFloat(val) || 0 } : c
    ))
  }

  const nominal = comps.reduce((s, c) => s + (c.direction === '+' ? c.nominal : -c.nominal), 0)
  const totalTol = method === 'wc'
    ? comps.reduce((s, c) => s + c.tolerance, 0)
    : Math.sqrt(comps.reduce((s, c) => s + c.tolerance ** 2, 0)) * (sigma / 3)
  const minGap = nominal - totalTol
  const maxGap = nominal + totalTol
  const gMin = parseFloat(goalMin)
  const gMax = parseFloat(goalMax)
  const passes = (isNaN(gMin) || minGap >= gMin) && (isNaN(gMax) || maxGap <= gMax)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Tolerance Stack-Up Calculator</h1>
          <p style={{ color: '#666', margin: '4px 0 0' }}>Worst case & statistical analysis for mechanical assemblies</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: '#555' }}>{user.email}</span>
              {!isPro && (
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, padding: '3px 8px', borderRadius: 12 }}>Free</span>
              )}
              <button onClick={handleLogout} style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: 13 }}>Log out</button>
            </>
          ) : (
            <button onClick={() => setAuthMode('login')} style={{ padding: '6px 14px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Sign in</button>
          )}
        </div>
      </div>

      {/* Auth box */}
      {!user && (
        <div style={{ background: '#f8faff', border: '1px solid #c7d7f5', borderRadius: 10, padding: 20, marginBottom: 24, maxWidth: 380 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setAuthMode(m)} style={{ flex: 1, padding: '7px 0', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: authMode === m ? '#1a56db' : '#fff', color: authMode === m ? '#fff' : '#333', fontWeight: 500, fontSize: 13 }}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
          <button onClick={handleAuth} style={{ width: '100%', padding: '9px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {authMode === 'login' ? 'Log in' : 'Create account'}
          </button>
          {authMsg && <p style={{ fontSize: 13, color: authMsg.includes('Check') ? '#15803d' : '#dc2626', marginTop: 10 }}>{authMsg}</p>}
        </div>
      )}

      {/* Calculator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['wc', 'rss'].map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, padding: '8px 0', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: method === m ? '#1a56db' : '#fff', color: method === m ? '#fff' : '#333', fontWeight: 500 }}>
                {m === 'wc' ? 'Worst Case' : 'RSS / Statistical'}
              </button>
            ))}
          </div>

          {method === 'rss' && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#555' }}>Sigma: {sigma}σ</span>
              <input type="range" min="1" max="6" step="0.5" value={sigma} onChange={e => setSigma(parseFloat(e.target.value))} style={{ flex: 1 }} />
            </div>
          )}

          {comps.map((c, i) => (
            <div key={c.id} style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ background: '#1a56db', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
                <input value={c.name} onChange={e => update(c.id, 'name', e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, outline: 'none' }} />
                <button onClick={() => remove(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', fontSize: 18 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['nominal', 'Nominal'], ['tolerance', '± Tolerance']].map(([field, label]) => (
                  <div key={field}>
                    <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
                    <input type="number" step="0.001" value={c[field]} onChange={e => update(c.id, field, e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Direction</div>
                  <select value={c.direction} onChange={e => update(c.id, 'direction', e.target.value)}
                    style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}>
                    <option value="+">+ adds</option>
                    <option value="-">− subtracts</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button onClick={add} style={{ width: '100%', padding: 10, border: '1px dashed #aaa', borderRadius: 8, background: 'none', cursor: 'pointer', color: '#555', fontSize: 14, marginTop: 4 }}>
            + Add component {!isPro && comps.length >= 3 ? '🔒 Pro' : ''}
          </button>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#444' }}>Gap / Clearance Goals</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Min goal', setGoalMin], ['Max goal', setGoalMax]].map(([label, setter]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label}</div>
                  <input type="number" step="0.001" placeholder="optional" onChange={e => setter(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[['Nominal Gap', nominal.toFixed(4)], ['Total Tolerance', '±' + totalTol.toFixed(4)], ['Min Possible', minGap.toFixed(4)], ['Max Possible', maxGap.toFixed(4)]].map(([label, val]) => (
              <div key={label} style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'monospace' }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background: passes ? '#f0fdf4' : '#fff5f5', border: `1px solid ${passes ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: passes ? '#15803d' : '#dc2626' }}>
              {!goalMin && !goalMax ? '— Set goals to check pass/fail' : passes ? '✓ PASSES goal' : '✗ FAILS goal'}
            </div>
          </div>

          {!isPro && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Upgrade to Pro — $19/month</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Unlimited components · Save projects · PDF export</div>
              <button style={{ background: '#1a56db', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 500 }}>
                Upgrade Now
              </button>
            </div>
          )}

          <div style={{ marginBottom: 8, fontSize: 13, color: '#555' }}>Component contributions</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                {['#', 'Name', 'Nominal', '±Tol', 'Dir', '%'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 6px', color: '#888', fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comps.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '5px 6px', color: '#999' }}>{i + 1}</td>
                  <td style={{ padding: '5px 6px' }}>{c.name}</td>
                  <td style={{ padding: '5px 6px', fontFamily: 'monospace' }}>{c.nominal.toFixed(3)}</td>
                  <td style={{ padding: '5px 6px', fontFamily: 'monospace' }}>±{c.tolerance.toFixed(3)}</td>
                  <td style={{ padding: '5px 6px', color: c.direction === '+' ? '#15803d' : '#dc2626' }}>{c.direction}</td>
                  <td style={{ padding: '5px 6px' }}>{totalTol > 0 ? ((c.tolerance / totalTol) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}