  function updateGrimoire() {
      return updateGrimoireLayout(players, allRoles, isTouchDevice, {
        CLICK_EXPAND_SUPPRESS_MS,
        showReminderContextMenu,
        updateGrimoire,
        saveAppState
      });
      const listItems = playerCircle.querySelectorAll('li');
      listItems.forEach((li, i) => {
          const player = players[i];
          const playerNameEl = li.querySelector('.player-name');
          playerNameEl.textContent = player.name;
          
          // Check if player is in NW or NE quadrant
          const angle = parseFloat(li.dataset.angle || '0');
          
          // Calculate the actual x,y position to determine quadrant
          const x = Math.cos(angle);
          const y = Math.sin(angle);
          
          // Names go on top for NW (x<0, y<0) and NE (x>0, y<0) quadrants
          const isNorthQuadrant = y < 0;
          
          if (isNorthQuadrant) {
              playerNameEl.classList.add('top-half');
              li.classList.add('is-north');
              li.classList.remove('is-south');
          } else {
              playerNameEl.classList.remove('top-half');
              li.classList.add('is-south');
              li.classList.remove('is-north');
          }