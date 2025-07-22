window.addEventListener('DOMContentLoaded', () => {
  // --- Enable participant autocomplete ---
  function enableParticipantSearch(input) {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const q = input.value.trim();
        if (!q) {
          removeAutocompleteList(input);
          return;
        }

        try {
          const res = await fetch(`/insert/api/employees/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();

          removeAutocompleteList(input);

          if (!data.length) return;

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
            li.textContent = `${e.id} - ${e.name}`;
            li.onclick = () => {
              input.value = e.id;
              removeAutocompleteList(input);
            };
            list.appendChild(li);
          });

          input.parentNode.appendChild(list);
        } catch (err) {
          console.error('🔍 Employee search failed:', err);
          removeAutocompleteList(input);
        }
      }, 300);
    });

    // Remove suggestions list when clicking outside or input blurred
    input.addEventListener('blur', () => {
      setTimeout(() => removeAutocompleteList(input), 200);
    });
  }

  function removeAutocompleteList(input) {
    input.parentNode.querySelectorAll('.autocomplete').forEach(el => el.remove());
  }

  // --- Add participant input ---
  window.addParticipant = function () {
    const container = document.getElementById('participantFields');
    const div = document.createElement('div');
    div.className = 'input-group mb-2 position-relative';
    div.innerHTML = `
      <input type="text" class="form-control" name="participants[]" placeholder="รหัสพนักงานหรือชื่อ" required />
      <button type="button" class="btn btn-outline-danger" onclick="removeParticipant(this.parentNode)">ลบ</button>
    `;
    container.appendChild(div);

    // Enable autocomplete on the newly added input
    enableParticipantSearch(div.querySelector('input'));
  };

  // --- Remove participant input ---
  window.removeParticipant = function (el) {
    el.remove();
  };

  // --- Custom purpose toggle ---
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

  // --- Initialize autocomplete for all existing participant inputs ---
  document.querySelectorAll('input[name="participants[]"]').forEach(enableParticipantSearch);
});
