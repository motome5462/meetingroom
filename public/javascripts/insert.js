function addParticipant() {
  const container = document.getElementById('participantFields');

  const wrapper = document.createElement('div');
  wrapper.className = 'input-group mb-2';

  const input = document.createElement('input');
  input.type = 'number';
  input.name = 'participants[]';
  input.className = 'form-control';
  input.placeholder = 'รหัสพนักงาน';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-outline-danger';
  btn.innerHTML = 'ลบ';
  btn.onclick = () => removeParticipant(wrapper);

  wrapper.appendChild(input);
  wrapper.appendChild(btn);
  container.appendChild(wrapper);

  updateRemoveButtons(); // ปรับปุ่มลบหลังเพิ่ม
}

function removeParticipant(wrapper) {
  const container = document.getElementById('participantFields');
  if (container.children.length > 1) {
    wrapper.remove();
    updateRemoveButtons(); // ปรับปุ่มลบหลังลบ
  }
}

function updateRemoveButtons() {
  const container = document.getElementById('participantFields');
  const wrappers = container.querySelectorAll('.input-group');

  wrappers.forEach((wrapper, index) => {
    const btn = wrapper.querySelector('button');
    if (btn) {
      btn.disabled = wrappers.length <= 1; // ปิดปุ่มลบถ้าเหลือช่องเดียว
    }
  });
}


  

document.addEventListener('DOMContentLoaded', () => {
  const purposeSelect = document.getElementById('purposeSelect');
  const customInput = document.getElementById('customPurposeInput');

  function toggleCustomPurpose() {
    if (purposeSelect.value === 'อื่น ๆ') {
      customInput.style.display = 'block';
      customInput.required = true;
    } else {
      customInput.style.display = 'none';
      customInput.required = false;
      customInput.value = '';
    }
  }

  purposeSelect.addEventListener('change', toggleCustomPurpose);

  // Initialize on load
  toggleCustomPurpose();
});