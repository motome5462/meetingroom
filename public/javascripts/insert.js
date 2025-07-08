function addParticipant() {
  const container = document.getElementById('participantFields');

  const wrapper = document.createElement('div');
  wrapper.className = 'input-group mb-2';

  const input = document.createElement('input');
  input.type = 'number';
  input.name = 'participants[]';
  input.className = 'form-control';
  input.placeholder = 'Employee ID';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-outline-danger';
  btn.innerHTML = 'ลบ';
  btn.onclick = () => wrapper.remove();

  wrapper.appendChild(input);
  wrapper.appendChild(btn);
  container.appendChild(wrapper);
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