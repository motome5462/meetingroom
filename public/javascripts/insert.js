// === Add/Remove Participants with Autocomplete ===
function addParticipant() {
  const container = document.getElementById('participantFields');

  const wrapper = document.createElement('div');
  wrapper.className = 'input-group mb-2 position-relative';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'participants[]';
  input.className = 'form-control';
  input.placeholder = 'รหัสพนักงานหรือชื่อ';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-outline-danger';
  btn.innerHTML = 'ลบ';
  btn.onclick = () => removeParticipant(wrapper);

  wrapper.appendChild(input);
  wrapper.appendChild(btn);
  container.appendChild(wrapper);

  enableParticipantSearch(input);
  updateRemoveButtons();
}

function removeParticipant(wrapper) {
  const container = document.getElementById('participantFields');
  if (container.children.length > 1) {
    wrapper.remove();
    updateRemoveButtons();
  }
}

function updateRemoveButtons() {
  const wrappers = document.querySelectorAll('#participantFields .input-group');
  wrappers.forEach(w => {
    const btn = w.querySelector('button');
    btn.disabled = wrappers.length <= 1;
  });
}

// === Purpose Toggle ===
function toggleCustomPurpose() {
  const select = document.getElementById('purposeSelect');
  const customInput = document.getElementById('customPurposeInput');
  if (select.value === 'อื่น ๆ') {
    customInput.classList.remove('d-none');
    customInput.required = true;
  } else {
    customInput.classList.add('d-none');
    customInput.required = false;
    customInput.value = '';
  }
}

// === Employee ID Name Display ===
function setupEmployeeNameLookup() {
  const input = document.getElementById('employeeidInput');
  const display = document.getElementById('employeeidName');

  async function updateName() {
    const id = input.value.trim();
    if (!id) return display.textContent = '';
    try {
      const res = await fetch(`/insert/api/employee/${id}`);
      const data = await res.json();
      display.textContent = data.name ? `👤 ${data.name} (${data.department})` : '❌ ไม่พบข้อมูลพนักงาน';
    } catch {
      display.textContent = '❌ ไม่พบข้อมูลพนักงาน';
    }
  }

  input.addEventListener('input', updateName);

  // เรียกเมื่อเลือกจาก autocomplete ด้วย
  input.addEventListener('selected', updateName);
}

// === Participant Autocomplete ===
function enableParticipantSearch(input) {
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const q = input.value.trim();
      if (!q) return;

      const res = await fetch(`/insert/api/employees/search?q=${q}`);
      const data = await res.json();

      // ลบ autocomplete เดิมก่อนสร้างใหม่
      input.parentNode.querySelectorAll('.autocomplete').forEach(el => el.remove());

      const list = document.createElement('ul');
      list.className = 'list-group position-absolute autocomplete';
      list.style.zIndex = 9999;
      list.style.top = `${input.offsetTop + input.offsetHeight}px`;
      list.style.left = `${input.offsetLeft}px`;
      list.style.width = `${input.offsetWidth}px`;
      list.style.maxHeight = '200px';
      list.style.overflowY = 'auto';

      data.forEach(e => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = `${e.id} - ${e.name} `;
        li.onclick = () => {
          input.value = e.id;
          // ปิด autocomplete ด้วย setTimeout เพื่อให้ event input ทำงานก่อน
          setTimeout(() => {
            if (list.parentNode) list.remove();
          }, 0);

          // ถ้าเป็น employeeidInput ให้แสดงชื่อทันที
          if (input.id === 'employeeidInput') {
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
          }
        };
        list.appendChild(li);
      });

      input.parentNode.appendChild(list);
    }, 300);
  });

  // ปิด autocomplete เมื่อคลิกข้างนอก
  document.addEventListener('click', function handler(e) {
    if (!input.parentNode.contains(e.target)) {
      input.parentNode.querySelectorAll('.autocomplete').forEach(el => el.remove());
    }
  });
}

// === AJAX Form Submission ===
function setupFormSubmission() {
  const form = document.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.participants = formData.getAll('participants[]');

    try {
      const res = await fetch('/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาด');
      } else {
        window.location.href = '/insert?success=1';
      }
    } catch {
      alert('⚠️ การส่งข้อมูลล้มเหลว');
    }
  });
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  toggleCustomPurpose();
  enableParticipantSearch(document.getElementById('employeeidInput'));
  setupEmployeeNameLookup();
  setupFormSubmission();
  document.getElementById('purposeSelect').addEventListener('change', toggleCustomPurpose);
  document.querySelectorAll('input[name="participants[]"]').forEach(enableParticipantSearch);
});