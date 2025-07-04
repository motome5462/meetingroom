  function addParticipant() {
    const container = document.getElementById('participantFields');
    const input = document.createElement('input');
    input.type = 'number';
    input.name = 'participants[]';
    input.className = 'form-control mb-2';
    input.placeholder = 'Employee ID';
    container.appendChild(input);
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