(function () {
    // theme toggle (demo only)
    const root = document.documentElement;
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const cur = root.getAttribute('data-theme');
        root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });

    // tab switching
    const tabs = document.querySelectorAll('.tab');
    const listSheets = document.getElementById('list-sheets');
    const listViews = document.getElementById('list-views');
    tabs.forEach(t => t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const isSheets = t.dataset.tab === 'sheets';
        listSheets.style.display = isSheets ? '' : 'none';
        listViews.style.display = isSheets ? 'none' : '';
    }));

    function updateSelCount() {
        const boxes = document.querySelectorAll('.list input[type=checkbox]');
        const n = [...boxes].filter(b => b.checked).length;
        document.getElementById('sel-count').textContent = n;
        document.getElementById('progress-status').textContent = `Ready — ${n} item${n === 1 ? '' : 's'} selected`;
    }

    document.querySelectorAll('.list input[type=checkbox]').forEach(b => b.addEventListener('change', updateSelCount));

    document.getElementById('select-all').addEventListener('click', () => {
        const visibleList = listSheets.style.display === 'none' ? listViews : listSheets;
        visibleList.querySelectorAll('input[type=checkbox]').forEach(b => b.checked = true);
        updateSelCount();
    });

    document.getElementById('clear-all').addEventListener('click', () => {
        const visibleList = listSheets.style.display === 'none' ? listViews : listSheets;
        visibleList.querySelectorAll('input[type=checkbox]').forEach(b => b.checked = false);
        updateSelCount();
    });

    // filter
    document.getElementById('filter').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('.list .row').forEach(row => {
            row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(q));
        });
    });

    // naming token type -> show either param dropdown or static text field
    const tokenType = document.getElementById('token-type');
    const tokenParam = document.getElementById('token-param');
    const tokenText = document.getElementById('token-text');

    tokenType.addEventListener('change', () => {
        const v = tokenType.value;
        if (v === 'Static text') {
            tokenParam.style.display = 'none';
            tokenText.style.display = '';
        } else if (v === 'Sheet/project parameter' || v === 'Global parameter') {
            tokenParam.style.display = '';
            tokenText.style.display = 'none';
        } else {
            tokenParam.style.display = 'none';
            tokenText.style.display = 'none';
        }
    });

    tokenType.dispatchEvent(new Event('change'));

    const chips = document.getElementById('chips');

    function tokenLabel() {
        const v = tokenType.value;
        if (v === 'Static text') return `"${tokenText.value || ''}"`;
        if (v === 'Sheet/project parameter') return `[Param: ${tokenParam.value}]`;
        if (v === 'Global parameter') return `[Global: ${tokenParam.value}]`;
        return `[${v}]`;
    }

    function updatePreview() {
        const parts = [...chips.querySelectorAll('.chip')].map(c => c.firstChild.textContent);
        let name = parts.map(p => {
            if (p.startsWith('"')) return p.slice(1, -1);
            if (p === '[Sheet Number]') return 'A-102';
            if (p === '[Sheet Name]') return 'Level 2 Floor Plan';
            if (p === '[View Name]') return '3D View - Exterior';
            const m = p.match(/^\[(?:Param|Global): (.+)\]$/);
            if (m) return ({ 'Revision': 'Rev A', 'Drawn By': 'JS', 'Checked By': 'MK', 'Issue Date': '2026-09-18' })[m[1]] || m[1];
            return '';
        }).join('');

        if (!name) name = 'A-102_Level 2 Floor Plan';

        const ext = document.querySelector('#format-toggle .active').dataset.format;
        document.getElementById('preview-text').textContent = `${name}.${ext}`;
    }

    document.getElementById('add-token').addEventListener('click', () => {
        const label = tokenLabel();
        if (!label || label === '""') return;

        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `${label}<button data-remove>×</button>`;
        chip.querySelector('button').addEventListener('click', () => {
            chip.remove();
            updatePreview();
        });

        chips.appendChild(chip);
        tokenText.value = '';
        updatePreview();
    });

    chips.querySelectorAll('button[data-remove]').forEach(b =>
        b.addEventListener('click', () => {
            b.closest('.chip').remove();
            updatePreview();
        })
    );

    // format toggle
    const formatBtns = document.querySelectorAll('#format-toggle button');
    const pdfOptions = document.getElementById('pdf-options');
    const dwgOptions = document.getElementById('dwg-options');

    formatBtns.forEach(btn => btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const isDwg = btn.dataset.format === 'dwg';
        pdfOptions.style.display = isDwg ? 'none' : '';
        dwgOptions.style.display = isDwg ? '' : 'none';
        updatePreview();
    }));

    // paper placement radios enable/disable the offset x/y inputs
    const placeCenter = document.getElementById('place-center');
    const placeOffset = document.getElementById('place-offset');
    const offsetLine = document.getElementById('offset-line');
    const offsetInputs = document.querySelectorAll('.offset-xy input');

    function syncPlacement() {
        const on = placeOffset.checked;
        offsetLine.classList.toggle('disabled', !on);
        offsetInputs.forEach(i => i.disabled = !on);
        offsetLine.querySelector('select').disabled = !on;
    }

    placeCenter.addEventListener('change', syncPlacement);
    placeOffset.addEventListener('change', syncPlacement);

    // zoom radios enable/disable the % field
    const zoomFit = document.getElementById('zoom-fit');
    const zoomPct = document.getElementById('zoom-pct');
    const zoomInput = document.querySelector('.zoom-input');

    function syncZoom() {
        zoomInput.disabled = !zoomPct.checked;
    }

    zoomFit.addEventListener('change', syncZoom);
    zoomPct.addEventListener('change', syncZoom);
    syncZoom();

    // combine checkbox
    const combine = document.getElementById('combine');
    const combineRow = document.getElementById('combine-name-row');
    combine.addEventListener('change', () => combineRow.classList.toggle('disabled', !combine.checked));

    // browse (demo)
    document.getElementById('browse').addEventListener('click', () => {
        document.getElementById('path').value = 'C:\\Projects\\Riverside Tower\\Export\\2026-09-18';
    });

    // export demo: fake progress + log
    document.getElementById('export-btn').addEventListener('click', () => {
        const btn = document.getElementById('export-btn');
        const fill = document.getElementById('progress-fill');
        const status = document.getElementById('progress-status');
        const log = document.getElementById('log');
        const items = [
            'A-101 Ground Floor Plan',
            'A-102 Level 2 Floor Plan',
            'A-104 Roof Plan',
            'A-201 North & South Elevations',
            'A-301 Building Section AA',
            'S-101 Foundation Plan'
        ];

        btn.disabled = true;
        log.innerHTML = '';
        log.classList.add('show');
        let i = 0;

        function step() {
            i++;
            const pct = Math.round((i / items.length) * 100);
            fill.style.width = `${pct}%`;
            status.textContent = `Exporting ${i}/${items.length}: ${items[i - 1]}`;

            const line = document.createElement('div');
            line.className = 'log-line ok';
            line.innerHTML = `<span class="status">OK</span><span>${items[i - 1]} → ${items[i - 1].split(' ')[0]}.pdf</span>`;
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;

            if (i < items.length) {
                setTimeout(step, 450);
            } else {
                status.textContent = `Done — ${items.length} exported`;
                btn.disabled = false;
            }
        }

        setTimeout(step, 300);
    });

    updatePreview();
})();