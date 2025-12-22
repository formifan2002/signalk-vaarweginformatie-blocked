const template = document.createElement('template');
template.innerHTML = `
  <style>
    .row { 
      display: flex; 
      gap: 10px; 
      align-items: flex-end; 
      flex-wrap: wrap; 
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #333;
    }

    input {
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 0.9rem;
      width: 9ch;
      box-sizing: content-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      border-color: #007bff;
      box-shadow: 0 0 3px rgba(0,123,255,0.4);
      outline: none;
    }

    button {
      padding: 6px 10px;
      background: #007bff;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      font-size: 0.85rem;
      transition: background 0.2s;
    }

    button:hover {
      background: #0056b3;
    }

    .actions { 
      margin-top: 8px; 
      display: flex; 
      gap: 8px; 
    }

    .error { 
      color: #b00020; 
      margin-top: 6px; 
      font-size: 0.8rem;
    }
  </style>
  <div class="row">
    <div class="field">
      <label id="labelStart" for="startDate"></label>
      <input id="startDate" size="10" placeholder="TT.MM.JJ" autocomplete="off">
    </div>
    <div class="field">
      <label id="labelEnd" for="endDate"></label>
      <input id="endDate" size="10" placeholder="TT.MM.JJ" autocomplete="off">
    </div>
    <button id="rangeBtn">📅</button>
  </div>
  <div class="actions">
    <button id="todayBtn">Nur heute</button>
    <button id="allBtn">Alle</button>
  </div>
  <div id="status" class="error"></div>
`;

class DateRangeComponent extends HTMLElement {
  static get observedAttributes() {
    return ['label-start','label-end','label-today','label-all'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.labelStart = shadow.getElementById('labelStart');
    this.labelEnd   = shadow.getElementById('labelEnd');
    this.startInput = shadow.getElementById('startDate');
    this.endInput   = shadow.getElementById('endDate');
    this.rangeBtn   = shadow.getElementById('rangeBtn');
    this.todayBtn   = shadow.getElementById('todayBtn');
    this.allBtn     = shadow.getElementById('allBtn');
    this.status     = shadow.getElementById('status');
  }

  connectedCallback() {
    const maxDays = parseInt(this.getAttribute('maxDays')) || 60;

    // Labels initial setzen
    this.labelStart.textContent = this.getAttribute('label-start') || 'Startdatum:';
    this.labelEnd.textContent   = this.getAttribute('label-end')   || 'Enddatum:';
    this.todayBtn.textContent   = this.getAttribute('label-today') || 'Nur heute';
    this.allBtn.textContent     = this.getAttribute('label-all')   || 'Alle'; 

    // Heute auf Mitternacht setzen
    const today = new Date();
    today.setHours(0,0,0,0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    // Flatpickr: Start
    this.fpStart = flatpickr(this.startInput, {
      disableMobile: true,
      dateFormat: "d.m.y",
      minDate: today,
      maxDate: maxDate,
      locale: "de",
      onChange: (selectedDates) => {
        const start = selectedDates[0] || null;
        this.fpEnd.set("minDate", start || today);
        if (start && this.endInput.value) {
          const end = this.fpEnd.parseDate(this.endInput.value, "d.m.y");
          if (end < start) this.fpEnd.clear();
        }
        this.validateAndEmit(today, maxDate, maxDays);
      }
    });

    // Flatpickr: Ende
    this.fpEnd = flatpickr(this.endInput, {
      disableMobile: true,
      dateFormat: "d.m.y",
      minDate: today,
      maxDate: maxDate,
      locale: "de",
      onOpen: () => {
        if (this.startInput.value) {
          const start = this.fpStart.parseDate(this.startInput.value, "d.m.y");
          if (start) this.fpEnd.set("minDate", start);
        } else {
          this.fpEnd.set("minDate", today);
        }
      },
      onChange: () => this.validateAndEmit(today, maxDate, maxDays)
    });

    // Range-Picker (immer ab heute)
    const hidden = document.createElement('input');
    hidden.style.display = 'none';
    this.shadowRoot.appendChild(hidden);

    this.fpRange = flatpickr(hidden, {
      disableMobile: true,
      mode: "range",
      dateFormat: "d.m.y",
      minDate: today,
      maxDate: maxDate,
      locale: "de",
      onValueUpdate: (selectedDates) => {
        if (selectedDates.length === 2) {
          const [start, end] = selectedDates;
          this.fpStart.setDate(start, true);
          this.fpEnd.setDate(end, true);
          this.fpEnd.set("minDate", start);
          this.validateAndEmit(today, maxDate, maxDays);
        }
      }
    });

    this.rangeBtn.addEventListener("click", () => {
      this.fpRange.set("minDate", today);
      this.fpRange.open();
    });

    // Button "Nur heute"
    this.todayBtn.addEventListener("click", () => {
      this.fpStart.setDate(today, true);
      this.fpEnd.setDate(today, true);
      this.fpEnd.set("minDate", today);
      this.validateAndEmit(today, maxDate, maxDays);
    });

    // Button "Alle"
    this.allBtn.addEventListener("click", () => {
      const endAll = new Date(today);
      endAll.setDate(today.getDate() + maxDays);
      this.fpStart.setDate(today, true);
      this.fpEnd.setDate(endAll, true);
      this.fpEnd.set("minDate", today);
      this.validateAndEmit(today, maxDate, maxDays);
    });

    // Vorbelege mit "Alle" beim Start
    setTimeout(() => {
      const endAll = new Date(today);
      endAll.setDate(today.getDate() + maxDays);
      this.fpStart.setDate(today, false);
      this.fpEnd.setDate(endAll, false);
    }, 100);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'label-start') {
      this.labelStart.textContent = newValue || 'Startdatum:';
    }
    if (name === 'label-end') {
      this.labelEnd.textContent = newValue || 'Enddatum:';
    }
    if (name === 'label-today') {
      this.todayBtn.textContent = newValue || 'Enddatum:';
    }
    if (name === 'label-all') {
      this.allBtn.textContent = newValue || 'Enddatum:';
    }
  }

  validateAndEmit(today, maxDate, maxDays) {
    this.status.textContent = "";
    const sVal = this.startInput.value;
    const eVal = this.endInput.value;
    if (!sVal || !eVal) return;

    const s = this.fpStart.parseDate(sVal, "d.m.y");
    const e = this.fpEnd.parseDate(eVal, "d.m.y");
    if (!s || !e) {
      this.status.textContent = "❌ Ungültiges Datum.";
      return;
    }
    if (s < today) {
      this.status.textContent = "❌ Startdatum muss ≥ heute sein.";
      return;
    }
    if (e > maxDate) {
      this.status.textContent = "❌ Enddatum muss ≤ heute+" + maxDays + " Tage sein.";
      return;
    }
    if (e < s) {
      this.status.textContent = "❌ Enddatum darf nicht vor dem Startdatum liegen.";
      return;
    }

    this.dispatchEvent(new CustomEvent("dateRangeSelected", {
      detail: { start: sVal, end: eVal }
    }));
  }
}

customElements.define("date-range-component", DateRangeComponent);