/* LUVI: ícone da instituição ao lado do select nativo. Sem carrossel. */
(() => {
  'use strict';
  const ids = ['conta','transferOrigem','transferDestino','luviFutureAccount','luviEditFutureAccount','luviPayAccount','luviInvoiceAccount','luviCardAccount','luviPurchaseCard'];
  const brands = [
    [/carteira|dinheiro em esp[eé]cie|esp[eé]cie/i, '#795239', '▣', true],
    [/ifood/i, '#d92332', 'iFood'], [/inter/i, '#f47721', 'inter'],
    [/nubank|nu pagamento/i, '#7831a5', 'nu'], [/bradesco/i, '#bd172b', 'Bradesco'],
    [/ita[uú]/i, '#ef6b16', 'Itaú'], [/santander/i, '#d71920', 'Santander'],
    [/caixa/i, '#1767ae', 'CAIXA'], [/banco do brasil|\bbb\b/i, '#e4bc00', 'BB'],
    [/picpay/i, '#188c57', 'PicPay'], [/mercado pago/i, '#1889d4', 'MP'],
    [/c6/i, '#303944', 'C6'], [/neon/i, '#087e92', 'Neon'],
    [/pagbank|pagseguro/i, '#2373bf', 'PagBank'], [/sicredi/i, '#237b39', 'Sicredi'],
    [/sicoob/i, '#155c55', 'Sicoob']
  ];
  function refreshIcon(select, icon) {
    const value = select.value;
    const accounts = Array.isArray(window.contas) ? window.contas : (typeof contas !== 'undefined' ? contas : []);
    const account = accounts.find(item => String(item.id) === String(value));
    const name = account?.nome || select.selectedOptions[0]?.textContent?.trim() || '';
    const fallback = brands.find(item => item[0].test(name));
    const color = account?.cor || (fallback ? fallback[1] : '#285681');
    icon.style.setProperty('--luvi-logo-color', color);
    icon.textContent = '';
    icon.title = name ? `Cor de identificação: ${name}` : 'Selecione uma conta';
    icon.setAttribute('aria-label', icon.title);
  }
  function setup(select) {
    if (select.dataset.luviVisualSelect === '1') return;
    // Limpa qualquer resíduo do carrossel de versões anteriores.
    select.classList.remove('luvi-native-select');
    select.removeAttribute('data-luvi-carousel');
    const old = select.nextElementSibling;
    if (old && old.classList.contains('luvi-account-picker')) old.remove();
    const row = document.createElement('div');
    row.className = 'luvi-account-select-row';
    const icon = document.createElement('span');
    icon.className = 'luvi-account-logo';
    row.insertBefore(icon, null);
    select.parentNode.insertBefore(row, select);
    row.appendChild(select);
    const update = () => refreshIcon(select, icon);
    select.addEventListener('change', update);
    new MutationObserver(update).observe(select, {childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['selected','label','value','disabled']});
    select.dataset.luviVisualSelect = '1';
    update();
    // Atualiza também seleções atribuídas por JavaScript sem disparar change.
    select.luviUpdateVisual = update;
  }
  function refresh() {
    ids.forEach(id => {
      const select = document.getElementById(id);
      if (select && select.tagName === 'SELECT') {
        setup(select);
        select.luviUpdateVisual?.();
      }
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    document.addEventListener('click', () => requestAnimationFrame(refresh), true);
    document.addEventListener('change', () => requestAnimationFrame(refresh), true);
  });
})();
