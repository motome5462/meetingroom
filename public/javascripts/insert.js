// Add a new participant input field with remove button
function addParticipant() {
  const container = document.getElementById('participantFields');

  // Create a wrapper div for input and button
  const wrapper = document.createElement('div');
  wrapper.className = 'input-group mb-2';

  // Create input field for participant employee ID (number)
  const input = document.createElement('input');
  input.type = 'number';
  input.name = 'participants[]';          // Name as array to submit multiple participants
  input.className = 'form-control';
  input.placeholder = 'รหัสพนักงาน';    // Placeholder text: "Employee ID"

  // Create remove button with styling
  const btn = document.createElement('button');
  btn.type = 'button';                    // Button that does not submit form
  btn.className = 'btn btn-outline-danger';
  btn.innerHTML = 'ลบ';                   // Button text: "Delete"
  btn.onclick = () => removeParticipant(wrapper);  // On click, remove this participant field

  // Append input and button to wrapper, then add to container
  wrapper.appendChild(input);
  wrapper.appendChild(btn);
  container.appendChild(wrapper);

  // Update remove button states after adding (disable if only one field)
  updateRemoveButtons();
}

// Remove participant input field if more than one exists
function removeParticipant(wrapper) {
  const container = document.getElementById('participantFields');

  // Only remove if there is more than one participant input field
  if (container.children.length > 1) {
    wrapper.remove();
    // Update remove buttons state after removal
    updateRemoveButtons();
  }
}

// Enable or disable remove buttons based on how many participant fields exist
function updateRemoveButtons() {
  const container = document.getElementById('participantFields');
  const wrappers = container.querySelectorAll('.input-group');

  wrappers.forEach((wrapper) => {
    const btn = wrapper.querySelector('button');
    if (btn) {
      // Disable remove button if only one participant field left
      btn.disabled = wrappers.length <= 1;
    }
  });
}


// Wait until the DOM is fully loaded before setting up event listeners
document.addEventListener('DOMContentLoaded', () => {
  const purposeSelect = document.getElementById('purposeSelect');       // Select element for meeting purpose
  const customInput = document.getElementById('customPurposeInput');    // Custom purpose input field (initially hidden)

  // Show or hide custom purpose input based on selected option
  function toggleCustomPurpose() {
    if (purposeSelect.value === 'อื่น ๆ') {       // If user selects "Other"
      customInput.style.display = 'block';         // Show custom input
      customInput.required = true;                  // Make it required
    } else {
      customInput.style.display = 'none';          // Hide custom input
      customInput.required = false;                 // Not required
      customInput.value = '';                        // Clear any existing input
    }
  }

  // Listen for changes on purpose dropdown to toggle custom input visibility
  purposeSelect.addEventListener('change', toggleCustomPurpose);

  // Initialize visibility on page load
  toggleCustomPurpose();
});
