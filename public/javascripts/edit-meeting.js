// edit-meeting.js

window.addEventListener('DOMContentLoaded', () => {
  // Participant add/remove logic
  window.addParticipant = function() {
    const container = document.getElementById('participantFields');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
      <input type="number" class="form-control" name="participants[]" placeholder="รหัสพนักงาน" />
      <button type="button" class="btn btn-outline-danger" onclick="removeParticipant(this.parentNode)">ลบ</button>
    `;
    container.appendChild(div);
  };

  window.removeParticipant = function(el) {
    el.remove();
  };

  // Show/hide custom purpose input
  const purposeSelect = document.getElementById('purposeSelect');
  const customPurposeInput = document.getElementById('customPurposeInput');

  function toggleCustomPurpose() {
    if (purposeSelect.value === 'อื่น ๆ') {
      customPurposeInput.style.display = 'block';
      customPurposeInput.required = true;
    } else {
      customPurposeInput.style.display = 'none';
      customPurposeInput.required = false;
      customPurposeInput.value = '';
    }
  }

  if (purposeSelect) {
    purposeSelect.addEventListener('change', toggleCustomPurpose);
    toggleCustomPurpose(); // initialize on load
  }
});
