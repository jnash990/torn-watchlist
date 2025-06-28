// ==UserScript==
// @name        Torn Market Watchlist
// @namespace   https://torn.com
// @match       https://www.torn.com/*
// @version     1.0
// @connect      api.torn.com
// @description watchlist for the torn market
// ==/UserScript==



(function () {
    'use strict';

    const getApiKey = () =>  {
      let APIKey = '###PDA-APIKEY###';
      return APIKey;
    }

    const STORAGE_KEY = 'my_market_watchlist';

    const getMarketWatchlist_v2 = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const setMarketWatchlist_v2 = (list) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      console.log(list);
    }


    const addItemToMarketWatchlist = async (id, name, value) => {
        const list = await getMarketWatchlist_v2();
        if (!list.some(t => t.id === id)) {
            list.push({ id, name, value });
            await setMarketWatchlist_v2(list);
            console.log(`${name} has been added to your market watchlist.`);
        }
    };

    const removeItemFromMarketWatchlist = async (id) => {
        const list = getMarketWatchlist_v2().filter(t => t.id !== id);
        await setMarketWatchlist_v2(list);
        console.log(`Item removed from your market watchlist.`);
    };

    const getMarketValue = async (id) => {
        const apiKey = getApiKey();
        if (!apiKey) return undefined;
        try {
            const res = await fetch(`https://api.torn.com/torn/${id}?key=${apiKey}&selections=items`);
            const data = await res.json();
            return data?.items?.[id]?.market_value
        } catch {
            return undefined;
        }
    };

    const getMarketListingPrice = async (id) => {
      const apiKey = getApiKey();
        if (!apiKey) return undefined;
        try {
            const res = await fetch(`https://api.torn.com/v2/market/${id}/itemmarket?key=${apiKey}`);
            const data = await res.json();
            return data?.itemmarket?.listings[0]?.price;
        } catch {
            return undefined;
        }
    }

    const renderMarketWatchlistBar = async () => {
      // 1. Find the container
      const container = document.querySelector('div[class*="user-information-mobile"]');
      if (!container || document.getElementById('market-watchlist-bar')) return;

      // 2. Create outer bar container (ticker style, inline)
      const bar = document.createElement('div');
      bar.id = 'market-watchlist-bar';
      bar.style.width = '100%';
      bar.style.background = '#111';
      bar.style.color = '#fff';
      bar.style.overflow = 'hidden';
      bar.style.whiteSpace = 'nowrap';
      bar.style.borderTop = '1px solid #444';
      bar.style.borderBottom = '1px solid #444';
      bar.style.fontFamily = 'monospace';
      bar.style.borderRadius = '4px';
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.justifyContent = 'center';

      // 3. Create inner scrolling content
      const barContent = document.createElement('div');
      barContent.id = 'market-watchlist-bar-content';
      barContent.style.display = 'inline-block';
      barContent.style.paddingLeft = '100%';
      barContent.style.animation = 'market-ticker-scroll 30s linear infinite';
      barContent.style.cursor = 'pointer';

      // Pausar animação ao passar o rato
      barContent.addEventListener('mouseenter', () => {
          barContent.style.animationPlayState = 'paused';
      });
      barContent.addEventListener('mouseleave', () => {
          barContent.style.animationPlayState = 'running';
      });

      // 4. Fetch watchlist
      const watchlist = await getMarketWatchlist_v2();

      // 5. Build content
      let html = '';
      for (const item of watchlist) {
          const { id, name, value: refPercent } = item;
          const market_value = await getMarketValue(id);
          const listing_price = await getMarketListingPrice(id);
          if (!market_value || !listing_price) continue;


          const diff = ((listing_price / market_value) - 1);
          const absDiff = Math.abs(diff);

          const diffPercentage = diff * 100;

          if ((absDiff*100) >= refPercent) {
              html += `
                <a href="https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${id}&itemName=${encodeURIComponent(name)}"
                   style="text-decoration: none; color: inherit;">
                  <div style="margin-right: 32px; display: inline-block;">
                    <b>${name}</b>:
                    <span style="color:${diff > 0 ? '#f00' : '#0f0'};">
                      ${diff > 0 ? '+' : ''}${diffPercentage.toFixed(2)}%
                    </span>
                    (Market: $${market_value.toLocaleString()})
                  </div>
                </a>
              `;

          }
      }

      barContent.innerHTML = html || '<span style="color: #888; padding-left: 1rem;">No items outside configured range.</span>';
      bar.appendChild(barContent);
      container.appendChild(bar);

      // 6. Add the animation style (only once)
      if (!document.getElementById('market-ticker-style')) {
          const style = document.createElement('style');
          style.id = 'market-ticker-style';
          style.textContent = `
              @keyframes market-ticker-scroll {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-100%); }
              }
          `;
          document.head.appendChild(style);
      }
    };


    const updateRefPercent = async (id, newValue) => {
      const list = await getMarketWatchlist_v2();
      const updated = list.map(item =>
        item.id === id ? { id: item.id, name: item.name, value: newValue } : item
      );
        setMarketWatchlist_v2(list);
    };

    const fetchItemData = async (id) => {
        const apiKey = getApiKey();
        if (!apiKey) return undefined;
        try {
            const res = await fetch(`https://api.torn.com/torn/${id}?key=${apiKey}&selections=items`);
            const data = await res.json();
            return data?.items?.[id];
        } catch {
            return undefined;
        }
    };

  const renderWatchlistConfigPanel = async () => {
    if (document.getElementById('watchlist-settings')) return;

    const container = document.createElement('div');
    container.id = 'watchlist-settings';
    container.style.marginTop = '12px';
    container.innerHTML = `
      <div id="watchlist-panel" style="display: none; padding: 10px; border: 1px solid #aaa; background: #f8f8f8; font-size: 13px;">
        <div id="watchlist-items" style="display: flex; flex-direction: column; gap: 8px;"></div>
        <hr style="margin: 10px 0;"/>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <input type="number" id="add-item-id" placeholder="Item ID" style="width: 100%; padding: 4px;">
          <input type="number" id="add-ref-percent" placeholder="Ref (%)" style="width: 100%; padding: 4px;">
          <button id="add-watchlist-btn" style="padding: 6px;">Add</button>
        </div>
      </div>
    `;

    const settingsLink = document.createElement('a');
    settingsLink.href = '#';
    settingsLink.className = 'back-to t-clear h c-pointer line-h24 right';
    settingsLink.style.marginLeft = '10px';
    settingsLink.style.fontSize = '16px';
    settingsLink.textContent = '⚙';

    const topLinks = document.querySelector('.content-title .links-top-wrap .content-title-links');
    if (topLinks) {
        topLinks.appendChild(settingsLink);
        const titleContainer = document.querySelector('.content-title');
        titleContainer?.appendChild(container);
    }

    // Toggle
    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        const panel = container.querySelector('#watchlist-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Show watchlist
    const renderList = async () => {
        const listContainer = container.querySelector('#watchlist-items');
        const list = await getMarketWatchlist_v2();
        listContainer.innerHTML = '';

        if (!list.length) {
            listContainer.innerHTML = '<i>No item added to the watchlist.</i>';
            return;
        }

        for (const { id, name, value } of list) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.gap = '8px';

            const nameLink = document.createElement('a');
            nameLink.href = `https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${id}&itemName=${encodeURIComponent(name)}`;
            nameLink.textContent = name;
            nameLink.style.flex = '1';

            const refInput = document.createElement('input');
            refInput.type = 'number';
            refInput.value = value;
            refInput.style.width = '50px';
            refInput.dataset.id = id;

            refInput.addEventListener('change', async (e) => {
                const newVal = parseFloat(e.target.value);
                if (!isNaN(newVal)) {
                    await updateRefPercent(parseInt(e.target.dataset.id), newVal);
                }
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '❌';
            removeBtn.style.padding = '2px 6px';
            removeBtn.dataset.id = id;

            removeBtn.addEventListener('click', async () => {
                await removeItemFromMarketWatchlist(id);
                renderList();
            });

            row.appendChild(nameLink);
            row.appendChild(refInput);
            row.appendChild(removeBtn);

            listContainer.appendChild(row);
        }
    };

    // Add button Handler
    container.querySelector('#add-watchlist-btn').addEventListener('click', async () => {
        const id = parseInt(document.getElementById('add-item-id').value);
        const value = parseFloat(document.getElementById('add-ref-percent').value);

        if (!id || isNaN(value)) {
            alert('Fill in a valid ID and value');
            return;
        }

        const item = await fetchItemData(id);
        if (!item || !item.name) {
            alert('Invalid Item or not found.');
            return;
        }

        await addItemToMarketWatchlist(id, item.name, value );
        document.getElementById('add-item-id').value = '';
        document.getElementById('add-ref-percent').value = '';
        renderList();
    });

    await renderList();
  };


    let alreadyInitialized = false;

    const refreshUI = () => {
      console.log(getMarketWatchlist_v2())
      if (!alreadyInitialized) {
          alreadyInitialized = true;
          const div = document.querySelector('div[class*="sidebar"][class*="mobile"]');
          if(!!div)
          {
              renderMarketWatchlistBar();
          }
      }
      if (location.href.includes('/page.php?sid=ItemMarket')) {
        renderWatchlistConfigPanel();
      }
    };

    const observer = new MutationObserver(refreshUI);
    observer.observe(document.body, { childList: true, subtree: true });
})();
