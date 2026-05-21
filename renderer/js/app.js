/* ─── Navigation ────────────────────────────────────────────────────────────── */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (link) link.classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => navigateTo(link.dataset.page));
});

document.querySelectorAll('[data-navigate]').forEach(el => {
  el.addEventListener('click', () => navigateTo(el.dataset.navigate));
});

/* ─── Settings Modal ────────────────────────────────────────────────────────── */
const settingsModal = document.getElementById('settingsModal');
const settingsBtn   = document.getElementById('settingsBtn');
const settingsClose = document.getElementById('settingsClose');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiKeyInput   = document.getElementById('api-key-input');
const settingsMsg   = document.getElementById('settings-msg');

function openSettings() {
  settingsModal.classList.remove('hidden');
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  settingsMsg.className = 'settings-msg hidden';
  settingsMsg.textContent = '';
}

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);

settingsModal.addEventListener('click', e => {
  if (e.target === settingsModal) closeSettings();
});

saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  settingsMsg.className = 'settings-msg hidden';

  try {
    await api.saveApiKey(key);
    settingsMsg.textContent = '✓ API key saved successfully.';
    settingsMsg.className = 'settings-msg success';
    apiKeyInput.value = '';
    document.getElementById('noKeyBanner').classList.add('hidden');
    setTimeout(closeSettings, 1200);
  } catch (err) {
    settingsMsg.textContent = err.message || 'Failed to save key.';
    settingsMsg.className = 'settings-msg error';
  }
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveApiKeyBtn.click();
});

/* ─── Banner: open settings link ───────────────────────────────────────────── */
document.getElementById('bannerOpenSettings').addEventListener('click', openSettings);

/* ─── Startup: check for API key ────────────────────────────────────────────── */
(async () => {
  const has = await api.hasApiKey();
  if (!has) {
    document.getElementById('noKeyBanner').classList.remove('hidden');
  }
})();

/* ─── Chip selection ────────────────────────────────────────────────────────── */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('selected'));
});

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function showLoading(container, message = 'Claude is thinking…') {
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>`;
}

function showError(container, message) {
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="error-state">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <p>${message}</p>
    </div>`;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? '.6' : '1';
}

function scoreClass(n) {
  if (n <= 4) return 'score-low';
  if (n <= 6) return 'score-mid';
  if (n <= 8) return 'score-good';
  return 'score-great';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Relocation Advisor ────────────────────────────────────────────────────── */
document.getElementById('rel-submit').addEventListener('click', async () => {
  const city    = document.getElementById('rel-city').value.trim();
  const budget  = document.getElementById('rel-budget').value.trim();
  const chips   = [...document.querySelectorAll('.chip.selected')].map(c => c.dataset.value);
  const results = document.getElementById('rel-results');
  const btn     = document.getElementById('rel-submit');

  if (!city) { alert('Please enter a city or region.'); return; }
  if (!budget) { alert('Please enter your monthly budget.'); return; }
  if (chips.length === 0) { alert('Please select at least one lifestyle preference.'); return; }

  setLoading(btn, true);
  showLoading(results, 'Finding the best neighbourhoods for you…');

  try {
    const data = await api.claudeRelocation({ city, budget, lifestyle: chips });
    const { neighbourhoods } = data;

    results.innerHTML = `
      <p class="results-label">3 Recommended Neighbourhoods</p>
      <div class="rel-cards">
        ${neighbourhoods.map((n, i) => `
          <div class="rel-card">
            <div class="rel-card-header">
              <div>
                <div class="rel-card-name">${escapeHtml(n.name)}</div>
                <div class="rel-card-city">${escapeHtml(n.city || city)}</div>
              </div>
              <div class="rel-card-rent">${escapeHtml(n.rent_range)}</div>
            </div>
            <div class="rel-card-reason">${escapeHtml(n.match_reason)}</div>
            <div class="rel-card-meta">
              <div class="rel-meta-item">
                <div class="rel-meta-label">✓ Best thing</div>
                <div class="rel-meta-value">${escapeHtml(n.advantage)}</div>
              </div>
              <div class="rel-meta-item watch">
                <div class="rel-meta-label">⚠ Watch out</div>
                <div class="rel-meta-value">${escapeHtml(n.watch_out)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (err) {
    showError(results, err.message || 'Something went wrong. Please check your API key in Settings and try again.');
  }

  setLoading(btn, false);
});

/* ─── Neighbourhood Decoder ─────────────────────────────────────────────────── */
document.getElementById('dec-submit').addEventListener('click', async () => {
  const area    = document.getElementById('dec-area').value.trim();
  const results = document.getElementById('dec-results');
  const btn     = document.getElementById('dec-submit');

  if (!area) { alert('Please enter a neighbourhood or area name.'); return; }

  setLoading(btn, true);
  showLoading(results, 'Decoding this neighbourhood…');

  try {
    const data = await api.claudeNeighbourhood({ area });
    const { area_name, overview, scores } = data;

    const scoreItems = [
      { key: 'safety',       icon: '🛡️', label: 'Safety' },
      { key: 'affordability',icon: '💰', label: 'Affordability' },
      { key: 'transport',    icon: '🚇', label: 'Transport' },
      { key: 'lifestyle',    icon: '🌿', label: 'Lifestyle' },
      { key: 'family',       icon: '👨‍👩‍👧', label: 'Family' },
    ];

    results.innerHTML = `
      <div class="dec-card">
        <div class="dec-area-name">${escapeHtml(area_name)}</div>
        <div class="dec-overview">${escapeHtml(overview)}</div>
        <div class="dec-scores">
          ${scoreItems.map(item => {
            const s = scores[item.key] || { score: 5, note: '' };
            const cls = scoreClass(s.score);
            const pct = (s.score / 10) * 100;
            return `
              <div class="score-row">
                <div class="score-label">
                  <span class="score-label-icon">${item.icon}</span>
                  ${item.label}
                </div>
                <div class="score-bar-wrap">
                  <div class="score-bar-fill ${cls}" style="width:0%" data-width="${pct}%"></div>
                </div>
                <div class="score-num ${cls}">${s.score}/10</div>
                <div class="score-note">${escapeHtml(s.note || '')}</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;

    // Animate score bars after render
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-bar-fill[data-width]').forEach(bar => {
        const w = bar.dataset.width;
        requestAnimationFrame(() => { bar.style.width = w; });
      });
    });
  } catch (err) {
    showError(results, err.message || 'Something went wrong. Please check your API key in Settings and try again.');
  }

  setLoading(btn, false);
});

/* ─── Lease Clause Explainer ────────────────────────────────────────────────── */
document.getElementById('lease-submit').addEventListener('click', async () => {
  const clause  = document.getElementById('lease-clause').value.trim();
  const results = document.getElementById('lease-results');
  const btn     = document.getElementById('lease-submit');

  if (!clause) { alert('Please paste a lease clause to analyse.'); return; }
  if (clause.length < 20) { alert('Please paste a longer clause for accurate analysis.'); return; }

  setLoading(btn, true);
  showLoading(results, 'Analysing your lease clause…');

  try {
    const data = await api.claudeLease({ clause });
    const { plain_english, red_flags, risk_rating, tenant_advice } = data;

    const riskIcon = risk_rating === 'LOW' ? '✓' : risk_rating === 'HIGH' ? '✗' : '!';

    const flagsHtml = (!red_flags || red_flags.length === 0)
      ? `<div class="no-flags">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
           No red flags found in this clause.
         </div>`
      : red_flags.map(f => `
          <div class="flag-item ${escapeHtml(f.severity)}">
            <div class="flag-dot ${escapeHtml(f.severity)}"></div>
            <div>
              <div class="flag-name">${escapeHtml(f.flag)}</div>
              <div class="flag-explanation">${escapeHtml(f.explanation)}</div>
            </div>
          </div>`).join('');

    results.innerHTML = `
      <div class="lease-card">
        <div class="lease-section">
          <div class="lease-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            What this means
          </div>
          <div class="lease-plain">${escapeHtml(plain_english)}</div>
        </div>

        <div class="lease-section">
          <div class="lease-section-title">
            Risk Rating
          </div>
          <span class="risk-badge risk-${escapeHtml(risk_rating)}">
            ${riskIcon} ${escapeHtml(risk_rating)} RISK
          </span>
        </div>

        <div class="lease-section">
          <div class="lease-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Red Flags
          </div>
          ${flagsHtml}
        </div>

        <div class="lease-section">
          <div class="lease-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Tenant Advice
          </div>
          <div class="lease-advice">${escapeHtml(tenant_advice)}</div>
        </div>
      </div>`;
  } catch (err) {
    showError(results, err.message || 'Something went wrong. Please check your API key in Settings and try again.');
  }

  setLoading(btn, false);
});

/* ─── Enter key shortcuts ───────────────────────────────────────────────────── */
document.getElementById('rel-city').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('rel-budget').focus();
});

document.getElementById('rel-budget').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('rel-submit').click();
});

document.getElementById('dec-area').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('dec-submit').click();
});
