(function () {
  const cardClasses = 'group relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl';

  function makeEventCard(item, index) {
    const card = document.createElement('article');
    card.className = `${cardClasses} card-hover`;
    card.dataset.aos = 'zoom-in';
    card.dataset.aosDelay = String(Math.min(index * 70, 500));

    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = item.title;
    image.loading = 'lazy';
    image.className = 'h-64 w-full object-cover transition duration-500 group-hover:scale-110';
    card.append(image);

    const shade = document.createElement('div');
    shade.className = 'absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-80';
    card.append(shade);

    const text = document.createElement('div');
    text.className = 'absolute bottom-0 left-0 p-6 text-white';
    const title = document.createElement('h3');
    title.className = 'text-xl font-bold';
    title.textContent = item.title;
    text.append(title);
    if (item.subtitle || item.year) {
      const subtitle = document.createElement('p');
      subtitle.className = 'mt-1 text-sm text-gray-100';
      subtitle.textContent = [item.subtitle, item.year].filter(Boolean).join(' · ');
      text.append(subtitle);
    }
    if (item.description) {
      const description = document.createElement('p');
      description.className = 'mt-2 text-sm text-gray-100';
      description.textContent = item.description;
      text.append(description);
    }
    card.append(text);
    return card;
  }

  function makeMemberCard(item, index) {
    const card = document.createElement('article');
    card.className = 'group relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl';
    card.dataset.aos = 'zoom-in';
    card.dataset.aosDelay = String(Math.min(index * 50, 450));

    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = item.title;
    image.loading = 'lazy';
    image.className = 'h-72 w-full object-cover transition duration-500 group-hover:scale-105';
    card.append(image);

    const details = document.createElement('div');
    details.className = 'p-4 text-center';
    const title = document.createElement('h3');
    title.className = 'font-semibold text-gray-800';
    title.textContent = item.title;
    details.append(title);
    const subtitleText = [item.subtitle, item.year].filter(Boolean).join(' · ');
    if (subtitleText) {
      const subtitle = document.createElement('p');
      subtitle.className = 'mt-1 text-sm text-gray-500';
      subtitle.textContent = subtitleText;
      details.append(subtitle);
    }
    if (item.description) {
      const description = document.createElement('p');
      description.className = 'mt-2 text-sm text-gray-600';
      description.textContent = item.description;
      details.append(description);
    }
    card.append(details);
    return card;
  }

  async function loadContent(container, type, limit) {
    try {
      const response = await fetch(`/api/content?type=${encodeURIComponent(type)}`);
      if (!response.ok) throw new Error(`Permintaan konten gagal (${response.status}).`);
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error('Format data konten tidak sesuai.');
      const items = typeof limit === 'number' ? result.items.slice(0, limit) : result.items;
      if (items.length) {
        container.replaceChildren();
        items.forEach((item, index) => container.append(
          type === 'members' ? makeMemberCard(item, index) : makeEventCard(item, index)
        ));
      } else if (!container.children.length) {
        const empty = document.createElement('p');
        empty.className = 'col-span-full py-12 text-center text-gray-500';
        empty.textContent = type === 'members' ? 'Data anggota belum tersedia.' : 'Kegiatan belum tersedia.';
        container.append(empty);
      }
      if (window.AOS) window.AOS.refresh();
    } catch (error) {
      console.error(`Konten ${type} belum dapat diperbarui:`, error);
      container.setAttribute('aria-label', 'Data tersimpan di Google Sheets belum dapat dimuat; menampilkan konten lokal.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const homeEvents = document.getElementById('home-events-grid');
    const events = document.getElementById('events-grid');
    const members = document.getElementById('members-grid');
    if (homeEvents) loadContent(homeEvents, 'events', 6);
    if (events) loadContent(events, 'events');
    if (members) loadContent(members, 'members');
  });
})();
