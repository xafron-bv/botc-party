export function renderGrimoireHistory({ grimoireHistoryList, history }) {
  if (!grimoireHistoryList) return;
  grimoireHistoryList.innerHTML = '';
  history.grimoireHistory.forEach(entry => {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    li.className = 'history-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'history-name';
    nameSpan.textContent = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
    // Inline edit input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'history-edit-input';
    nameInput.value = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
    nameInput.style.display = 'none';
    // Icons
    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn rename';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'icon-btn save';
    saveBtn.title = 'Save';
    saveBtn.style.display = 'none';
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    li.appendChild(nameSpan);
    li.appendChild(nameInput);
    li.appendChild(renameBtn);
    li.appendChild(saveBtn);
    li.appendChild(deleteBtn);
    grimoireHistoryList.appendChild(li);
  });
}
