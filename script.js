// Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
          repositionPlayersLayout(players);
          updateGrimoireLayout(players, allRoles, isTouchDevice);
          saveAppState();
          renderSetupInfo();
      });