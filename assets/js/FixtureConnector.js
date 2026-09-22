(function () {
  const fixtureBtn = document.getElementById('btn-fixture');
  const pipeBtn = document.getElementById('btn-pipe');
  const fixtureLabel = document.getElementById('label-fixture');
  const pipeLabel = document.getElementById('label-pipe');
  const rowFixture = document.getElementById('row-fixture');
  const rowPipe = document.getElementById('row-pipe');
  const createBtn = document.getElementById('create-btn');
  const type1 = document.getElementById('type-1');
  const type2 = document.getElementById('type-2');
  const pvTag = document.getElementById('pv-tag');
  const slope = document.getElementById('slope');
  const slopeVal = document.getElementById('slope-val');
  const slopeRatio = document.getElementById('slope-ratio');
  const branchPath = document.getElementById('branch-path');
  const fitRiser = document.getElementById('fit-riser');
  const fitTee = document.getElementById('fit-tee');
  const dimLine = document.getElementById('dim-line');
  const dimText = document.getElementById('dim-text');

  let state = {
    fixturePicked: false,
    pipePicked: false,
    type: 1,
    slopePct: 2
  };

  function simulatePick(btn, label, row, key, resultText) {
    btn.addEventListener('click', () => {
      if (state[key]) {
        state[key] = false;
        row.classList.remove('done');
        label.textContent = 'Nothing selected';
        btn.textContent = btn.dataset.label;
        updateCreateState();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Pick in model…';
      label.textContent = 'Waiting for selection…';
      setTimeout(() => {
        state[key] = true;
        row.classList.add('done');
        label.innerHTML = resultText;
        btn.disabled = false;
        btn.textContent = 'Change';
        updateCreateState();
      }, 550);
    });
    btn.dataset.label = btn.textContent;
  }

  simulatePick(fixtureBtn, fixtureLabel, rowFixture, 'fixturePicked', '<b>Toilet</b> — floor mounted');
  simulatePick(pipeBtn, pipeLabel, rowPipe, 'pipePicked', '<b>Soil pipe</b> — 4" cast iron');

  function updateCreateState() {
    createBtn.disabled = !(state.fixturePicked && state.pipePicked);
  }

  function selectType(n) {
    state.type = n;
    type1.setAttribute('aria-pressed', n === 1 ? 'true' : 'false');
    type2.setAttribute('aria-pressed', n === 2 ? 'true' : 'false');
    pvTag.textContent = n === 1 ? 'OFFSET TEE' : 'DIRECT TEE';
    drawStage();
  }
  type1.addEventListener('click', () => selectType(1));
  type2.addEventListener('click', () => selectType(2));

  function updateSlopeReadout() {
    const pct = parseFloat(slope.value);
    state.slopePct = pct;
    slopeVal.textContent = pct.toFixed(2) + '%';
    const ratio = Math.round(100 / pct);
    slopeRatio.textContent = '1 : ' + ratio;
    drawStage();
  }
  slope.addEventListener('input', updateSlopeReadout);

  // ---- schematic drawing ----
  const mainY = 210;
  const fixtureX = 261;      // fixture connector x
  const fixtureTopY = 62;    // where riser starts below fixture

  function drawStage() {
    if (state.type === 1) {
      // riser down, then 45deg branch offset to the left into a tee on main pipe
      const teeX = fixtureX - 90;
      const kneeY = 120 - (state.slopePct - 1) * 6; // steeper slope -> knee sits a touch higher
      const d = `M ${fixtureX} ${fixtureTopY} V ${kneeY} L ${teeX} ${mainY}`;
      branchPath.setAttribute('d', d);
      fitRiser.setAttribute('cx', fixtureX);
      fitRiser.setAttribute('cy', kneeY);
      fitTee.setAttribute('cx', teeX);
      fitTee.setAttribute('cy', mainY);

      dimLine.setAttribute('x1', teeX);
      dimLine.setAttribute('y1', mainY + 16);
      dimLine.setAttribute('x2', fixtureX);
      dimLine.setAttribute('y2', mainY + 16);
      dimLine.style.opacity = 1;
      dimText.textContent = 'offset';
      dimText.setAttribute('x', (teeX + fixtureX) / 2 - 14);
      dimText.setAttribute('y', mainY + 28);
      dimText.style.opacity = 1;
    } else {
      // direct: straight riser into a tee right under the fixture
      const teeX = fixtureX;
      const d = `M ${fixtureX} ${fixtureTopY} V ${mainY}`;
      branchPath.setAttribute('d', d);
      fitRiser.setAttribute('cx', fixtureX);
      fitRiser.setAttribute('cy', fixtureTopY);
      fitRiser.setAttribute('r', 0.001);
      fitTee.setAttribute('cx', teeX);
      fitTee.setAttribute('cy', mainY);

      dimLine.style.opacity = 0;
      dimText.style.opacity = 0;
    }
    if (state.type === 1) fitRiser.setAttribute('r', 5);
  }

  updateSlopeReadout();
  drawStage();
})();