/* @ts-nocheck */
let produtos = [];
let categorias = [];

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.onload = () => {
  aplicarModoEscuro();

  const toggleDark = document.getElementById('toggleDark');
  const cardReceita = document.getElementById('cardReceita');
  const btnCriarCategoria = document.getElementById('btnCriarCategoria');
  
  toggleDark.replaceWith(toggleDark.cloneNode(true));
  cardReceita.replaceWith(cardReceita.cloneNode(true));
  btnCriarCategoria.replaceWith(btnCriarCategoria.cloneNode(true));

  document.getElementById('toggleDark').addEventListener('click', alternarModoEscuro);
  document.getElementById('cardReceita').addEventListener('click', mostrarDetalhesReceita);
  document.getElementById('btnCriarCategoria').addEventListener('click', () => mostrarModalCriarCategoria());

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const newItem = item.cloneNode(true);
    item.replaceWith(newItem);
    newItem.addEventListener('click', () => {
      const secao = newItem.getAttribute('data-secao');
      mostrarSecao(secao);
    });
  });

  if (typeof window.db !== 'undefined' && window.db && window.firestoreFunctions && window.storageFunctions) {
    carregarProdutosFirestore();
    carregarCategorias();
  } else {
    console.error("Firebase não inicializado corretamente:", window.db, window.firestoreFunctions, window.storageFunctions);
    alert("Erro: Firebase não está inicializado. Verifique a console.");
  }
  mostrarSecao('painel');
};

function alternarModoEscuro() {
  const corpo = document.body;
  corpo.classList.toggle('modo-escuro');
  const isDarkMode = corpo.classList.contains('modo-escuro');
  localStorage.setItem('modoEscuro', isDarkMode);
  document.getElementById('toggleDark').innerHTML = isDarkMode 
    ? '<i class="fas fa-sun"></i> Mudar para Modo Claro' 
    : '<i class="fas fa-moon"></i> Mudar para Modo Escuro';
}

function aplicarModoEscuro() {
  const modoSalvo = localStorage.getItem('modoEscuro') === 'true';
  if (modoSalvo) {
    document.body.classList.add('modo-escuro');
    document.getElementById('toggleDark').innerHTML = '<i class="fas fa-sun"></i> Mudar para Modo Claro';
  } else {
    document.getElementById('toggleDark').innerHTML = '<i class="fas fa-moon"></i> Mudar para Modo Escuro';
  }
}

function mostrarSecao(secao) {
  const secoes = document.querySelectorAll("main > section");
  secoes.forEach(s => s.style.display = "none");

  const ativa = document.getElementById(`secao-${secao}`);
  if (ativa) ativa.style.display = "block";

  const itens = document.querySelectorAll(".nav-item");
  itens.forEach(i => i.classList.remove("active"));

  const nomes = ['painel', 'categorias', 'backup', 'operacao', 'necessario', 'manutencao', 'todos'];
  const index = nomes.indexOf(secao);
  if (index >= 0) itens[index].classList.add("active");

  if (['backup', 'operacao', 'necessario', 'todos'].includes(secao)) {
    const status = secao === 'operacao' ? 'operacao' :
                   secao === 'necessario' ? 'necessario' :
                   secao === 'todos' ? 'todos' : 'backup';
    listarProdutos(status);
  }

  if (secao === 'painel') {
    atualizarDashboard();
    listarProdutosPainel();
  }
  if (secao === 'manutencao') carregarManutencao();
  if (secao === 'categorias') carregarCategorias();
}

function mostrarModalCriarCategoria() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Criar Nova Categoria</h3>
      <label>Nome:</label><input id="nomeCategoria" type="text" required><br>
      <label>Responsável:</label><input id="responsavel" type="text" required><br>
      <label>Ícone:</label>
      <input id="iconSearch" type="text" placeholder="Pesquisar ícones...">
      <div id="iconResults" class="icon-results"></div>
      <input id="iconUrl" type="hidden">
      <button id="confirmCategoriaButton">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmCategoriaButton');
  confirmButton.addEventListener('click', confirmarCriarCategoria);

  const iconSearch = modal.querySelector('#iconSearch');
  iconSearch.addEventListener('input', debounce((e) => buscarIcones(e.target.value), 300));
}

async function buscarIcones(query) {
  const resultsContainer = document.getElementById('iconResults');
  if (!resultsContainer) return;
  resultsContainer.innerHTML = 'Carregando...';

  try {
    const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=12`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    resultsContainer.innerHTML = '';

    if (data.icons && data.icons.length > 0) {
      data.icons.forEach(icon => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-option';
        iconDiv.innerHTML = `<img src="https://api.iconify.design/${icon}.svg?width=32&height=32" class="icon-preview" alt="${icon}">`;
        iconDiv.onclick = () => selecionarIcone(`https://api.iconify.design/${icon}.svg`, icon);
        resultsContainer.appendChild(iconDiv);
      });
    } else {
      resultsContainer.innerHTML = '<div>Nenhum ícone encontrado. Tente outro termo.</div>';
    }
  } catch (error) {
    console.error('Erro ao buscar ícones:', error);
    resultsContainer.innerHTML = '<div>Erro ao carregar ícones. Tente novamente.</div>';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'icon-option';
    iconDiv.innerHTML = `<img src="https://api.iconify.design/mdi:help-circle.svg?width=32&height=32" class="icon-preview" alt="fallback-icon">`;
    iconDiv.onclick = () => selecionarIcone('https://api.iconify.design/mdi:help-circle.svg', 'mdi:help-circle');
    resultsContainer.appendChild(iconDiv);
  }
}

function selecionarIcone(url, iconName) {
  const iconUrlInput = document.getElementById('iconUrl');
  const resultsContainer = document.getElementById('iconResults');
  if (iconUrlInput && resultsContainer) {
    iconUrlInput.value = url;
    resultsContainer.innerHTML = `<img src="${url}?width=48&height=48" class="icon-preview selected" alt="${iconName}">`;
  }
}

function confirmarCriarCategoria() {
  const nome = document.getElementById('nomeCategoria')?.value.trim();
  const responsavel = document.getElementById('responsavel')?.value.trim();
  const iconUrl = document.getElementById('iconUrl')?.value.trim();

  if (!nome || !responsavel) {
    alert("Por favor, preencha o nome e o responsável da categoria.");
    return;
  }

  if (!iconUrl) {
    alert("Por favor, selecione um ícone para a categoria.");
    return;
  }

  const { collection, addDoc } = window.firestoreFunctions;
  addDoc(collection(window.db, "categorias"), { nome, responsavel, icon: iconUrl })
    .then(docRef => {
      categorias.push({ id: docRef.id, nome, responsavel, icon: iconUrl });
      alert("Categoria criada com sucesso!");
      document.querySelector('.modal')?.remove();
      carregarCategorias();
      listarProdutosPainel();
    })
    .catch(error => {
      console.error("Erro ao criar categoria:", error);
      alert("Falha ao criar categoria no Firebase.");
    });
}

function carregarCategorias() {
  const { collection, getDocs } = window.firestoreFunctions;
  const container = document.getElementById("categoriasContainer");
  if (!container) return;

  container.innerHTML = "";

  getDocs(collection(window.db, "categorias")).then(snapshot => {
    container.innerHTML = "";
    categorias = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      categorias.push({ id: doc.id, ...data });
      const card = document.createElement("div");
      card.className = "categoria-card";
      card.innerHTML = `
        <img src="${data.icon || 'https://api.iconify.design/mdi:help-circle.svg'}?width=48&height=48" class="categoria-icon" alt="${data.nome}">
        <div>
          <strong>${data.nome}</strong><br>
          <small>Responsável: ${data.responsavel || 'N/A'}</small>
        </div>
      `;
      const newCard = card.cloneNode(true);
      card.replaceWith(newCard);
      newCard.onclick = () => filtrarPorCategoria(data.nome, doc.id);
      container.appendChild(newCard);
    });
    listarProdutosPainel();
  }).catch(error => {
    console.error("Erro ao carregar categorias:", error);
    alert("Falha ao carregar categorias do Firebase.");
  });
}

function filtrarPorCategoria(nomeCategoria, categoriaId) {
  const produtosFiltrados = produtos.filter(p => p.categoria === nomeCategoria);
  const secao = document.getElementById("secao-categoria-detalhes");
  secao.style.display = "block";
  document.querySelectorAll("main > section:not(#secao-categoria-detalhes)").forEach(s => s.style.display = "none");

  const tabela = document.getElementById("tabelaProdutosCategoria");
  tabela.innerHTML = "";

  const existingHeader = tabela.parentElement.querySelector('.table-header');
  if (existingHeader) existingHeader.remove();
  const existingActionBar = tabela.parentElement.querySelector('.category-action-bar');
  if (existingActionBar) existingActionBar.remove();

  const header = document.createElement("div");
  header.className = "table-header";
  header.innerHTML = `
    <button class="back-button" onclick="mostrarSecao('painel')">⬅️ Voltar</button>
    <button class="criar-produto" onclick="mostrarModalCriarProduto('categoria', '${nomeCategoria}')">Criar Produto</button>
  `;
  tabela.parentElement.insertBefore(header, tabela);

  const tbody = document.createElement("tbody");
  produtosFiltrados.forEach((produto, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td onclick="mostrarDetalhesProduto(${i})" style="cursor: pointer;">${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>R$ ${produto.valor.toFixed(2)}</td>
      <td>${produto.status}</td>
      <td>${produto.status === 'manutencao' ? (produto.localConserto || 'N/A') : 'N/A'}</td>
      <td>${produto.email || 'N/A'}</td>
      <td>${produto.jogo || 'N/A'}</td>
      <td>
        ${['backup', 'operacao', 'necessario', 'manutencao']
          .filter(opt => opt !== produto.status)
          .map(opt => `
            <button onclick="mostrarModalTransferencia(${i}, '${opt}', 'categoria')"> ${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : opt === 'necessario' ? '🔩 Necessário OPS' : '📦 Backup'}</button>
          `).join('')}
        <button onclick="excluirProduto(${i}, 'categoria')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tabela.appendChild(tbody);

  const actionBar = document.createElement("div");
  actionBar.className = "category-action-bar";
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-category-btn";
  deleteButton.textContent = "Excluir Categoria";
  deleteButton.onclick = () => excluirCategoria(categoriaId, nomeCategoria);
  actionBar.appendChild(deleteButton);
  tabela.parentElement.appendChild(actionBar);

  const itens = document.querySelectorAll(".nav-item");
  itens.forEach(i => i.classList.remove("active"));
}

function mostrarModalExcluirCategoria() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Excluir Categoria</h3>
      <label>Selecione a Categoria:</label>
      <select id="categoriaExcluir" required>
        <option value="">Selecione uma categoria</option>
        ${categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
      </select><br>
      <button id="confirmExcluirCategoria">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmExcluirCategoria');
  confirmButton.addEventListener('click', () => {
    const categoriaId = document.getElementById('categoriaExcluir')?.value;
    const categoria = categorias.find(c => c.id === categoriaId);
    if (!categoriaId || !categoria) {
      alert("Por favor, selecione uma categoria.");
      return;
    }
    excluirCategoria(categoriaId, categoria.nome);
  });
}

function excluirCategoria(categoriaId, nomeCategoria) {
  if (confirm(`Deseja realmente excluir a categoria "${nomeCategoria}"? Os produtos associados permanecerão, mas sem categoria.`)) {
    if (!window.db || !window.firestoreFunctions) return;
    const { doc, deleteDoc, collection, getDocs, setDoc } = window.firestoreFunctions;

    const produtosParaAtualizar = produtos.filter(p => p.categoria === nomeCategoria);
    const updatePromises = produtosParaAtualizar.map(p => {
      p.categoria = '';
      return setDoc(doc(window.db, "produtos", p.id), p);
    });

    Promise.all(updatePromises)
      .then(() => {
        deleteDoc(doc(window.db, "categorias", categoriaId))
          .then(() => {
            produtos = produtos.map(p => p.categoria === nomeCategoria ? { ...p, categoria: '' } : p);
            categorias = categorias.filter(c => c.id !== categoriaId);
            alert("Categoria excluída com sucesso! Produtos associados agora estão sem categoria.");
            document.querySelector('.modal')?.remove();
            carregarCategorias();
            listarProdutosPainel();
            const secao = document.getElementById("secao-categoria-detalhes");
            if (secao) secao.style.display = "none";
            mostrarSecao('painel');
          })
          .catch(error => {
            console.error("Erro ao excluir categoria:", error);
            alert("Falha ao excluir categoria.");
          });
      })
      .catch(error => {
        console.error("Erro ao atualizar produtos:", error);
        alert("Falha ao atualizar produtos associados.");
      });
  }
}

function mostrarModalCriarProduto(status, categoriaPreenchida = '') {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Criar Novo Produto</h3>
      <label>Nome:</label><input id="nome" type="text" required><br>
      <label>Quantidade:</label><input id="quantidade" type="number" min="0" required><br>
      <label>Categoria:</label><input id="categoria" type="text" value="${categoriaPreenchida}" required><br>
      <label>Valor Unitário:</label><input id="valor" type="number" step="0.01" min="0" required><br>
      <label>Status:</label>
      <select id="status" required>
        <option value="backup">Backup</option>
        <option value="operacao">Operação</option>
        <option value="necessario">Necessário OPS</option>
        <option value="manutencao">Manutenção</option>
      </select><br>
      <label>Email (opcional):</label><input id="email" type="email"><br>
      <label>Jogo (opcional):</label><input id="jogo" type="text"><br>
      <button id="confirmButton">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmButton');
  confirmButton.addEventListener('click', () => confirmarCriarProduto(status));
}

function confirmarCriarProduto(status) {
  const nome = document.getElementById('nome')?.value.trim();
  const quantidade = parseInt(document.getElementById('quantidade')?.value || 0);
  const categoria = document.getElementById('categoria')?.value.trim();
  const valor = parseFloat(document.getElementById('valor')?.value || 0);
  const selectedStatus = document.getElementById('status')?.value;
  const email = document.getElementById('email')?.value.trim() || '';
  const jogo = document.getElementById('jogo')?.value.trim() || '';

  if (!nome || quantidade < 0 || !categoria || valor < 0 || !selectedStatus) {
    alert("Por favor, preencha todos os campos obrigatórios corretamente.");
    return;
  }

  if (typeof window.db === 'undefined' || !window.db || !window.firestoreFunctions) {
    alert("Erro: Firebase não está inicializado.");
    return;
  }

  const novoProduto = {
    nome,
    quantidade,
    categoria,
    valor,
    status: selectedStatus,
    email,
    jogo,
    defeito: selectedStatus === 'manutencao' ? '' : '',
    localConserto: selectedStatus === 'manutencao' ? '' : '',
    custoManutencao: selectedStatus === 'manutencao' ? 0 : 0,
    agendamento: selectedStatus === 'manutencao' ? '' : '',
    historicoTransferencias: []
  };
  adicionarProdutoFirestore(novoProduto);
  document.querySelector('.modal')?.remove();
  atualizarDashboard();
}

function carregarProdutosFirestore() {
  if (!window.db || !window.firestoreFunctions || typeof window.firestoreFunctions.collection !== 'function') {
    console.error("Firestore não inicializado corretamente:", window.db, window.firestoreFunctions);
    alert("Erro: Firestore não está disponível. Verifique a console.");
    return;
  }
  const { collection, getDocs } = window.firestoreFunctions;
  getDocs(collection(window.db, "produtos")).then((querySnapshot) => {
    produtos = [];
    querySnapshot.forEach((doc) => {
      produtos.push({ id: doc.id, ...doc.data() });
    });
    atualizarListas();
    atualizarDashboard();
    listarProdutosPainel();
  }).catch((error) => {
    console.error("Erro ao carregar produtos:", error);
    alert("Erro ao carregar produtos do Firebase.");
  });
}

function adicionarProdutoFirestore(produto) {
  if (!window.db || !window.firestoreFunctions) return;
  const { collection, addDoc } = window.firestoreFunctions;
  addDoc(collection(window.db, "produtos"), produto).then((docRef) => {
    produto.id = docRef.id;
    produtos.push(produto);
    atualizarListas();
    atualizarDashboard();
    listarProdutosPainel();
  }).catch((error) => {
    console.error("Erro ao adicionar produto:", error);
    alert("Falha ao adicionar produto ao Firebase.");
  });
}

function atualizarProdutoFirestore(produto) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  setDoc(doc(window.db, "produtos", produto.id), produto).then(() => {
    const index = produtos.findIndex(p => p.id === produto.id);
    if (index !== -1) produtos[index] = produto;
    atualizarListas();
    atualizarDashboard();
    listarProdutosPainel();
  }).catch((error) => {
    console.error("Erro ao atualizar produto:", error);
    alert("Falha ao atualizar produto no Firebase.");
  });
}

function listarProdutosPainel() {
  const tabela = document.getElementById("tabelaProdutosPainel");
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  produtos.forEach((produto, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td onclick="mostrarDetalhesProduto(${i})" style="cursor: pointer;">${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>
        <select onchange="atualizarCategoriaProduto('${produto.id}', this.value)">
          <option value="">Sem categoria</option>
          ${categorias.map(c => `<option value="${c.nome}" ${produto.categoria === c.nome ? 'selected' : ''}>${c.nome}</option>`).join('')}
        </select>
      </td>
      <td>R$ ${produto.valor.toFixed(2)}</td>
      <td>${produto.status}</td>
      <td>${produto.email || 'N/A'}</td>
      <td>${produto.jogo || 'N/A'}</td>
      <td>
        ${['backup', 'operacao', 'necessario', 'manutencao']
          .filter(opt => opt !== produto.status)
          .map(opt => `
            <button onclick="mostrarModalTransferencia(${i}, '${opt}', 'todos')"> ${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : opt === 'necessario' ? '🔩 Necessário OPS' : '📦 Backup'}</button>
          `).join('')}
        <button onclick="excluirProduto(${i}, 'todos')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarCategoriaProduto(produtoId, novaCategoria) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === produtoId);
  if (produto) {
    produto.categoria = novaCategoria;
    setDoc(doc(window.db, "produtos", produto.id), produto)
      .then(() => {
        listarProdutosPainel();
        atualizarListas();
      })
      .catch(error => {
        console.error("Erro ao atualizar categoria do produto:", error);
        alert("Falha ao atualizar categoria do produto.");
      });
  }
}

function listarProdutos(filtroStatus) {
  const tabelaId = filtroStatus === 'backup' ? 'tabelaProdutosBackup' :
                  filtroStatus === 'operacao' ? 'tabelaProdutosOperacao' :
                  filtroStatus === 'necessario' ? 'tabelaProdutosNecessario' :
                  'tabelaProdutosTodos';
  const tabela = document.getElementById(tabelaId);
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  const existingHeader = tabela.parentElement.querySelector('.table-header');
  if (existingHeader) existingHeader.remove();

  const container = document.createElement("div");
  container.className = "table-header";
  const botaoCriar = document.createElement("button");
  botaoCriar.textContent = "Criar Produto";
  botaoCriar.className = "criar-produto";
  botaoCriar.setAttribute('aria-label', 'Criar novo produto');
  botaoCriar.onclick = () => mostrarModalCriarProduto(filtroStatus);
  container.appendChild(botaoCriar);

  if (filtroStatus === 'todos') {
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.placeholder = "Pesquisar...";
    searchBar.className = "search-bar";
    searchBar.oninput = () => filtrarProdutos(filtroStatus);
    const searchIcon = document.createElement("span");
    searchIcon.className = "search-icon";
    searchIcon.innerHTML = "🔍";
    searchIcon.setAttribute('aria-label', 'Pesquisar produtos');
    searchContainer.appendChild(searchBar);
    searchContainer.appendChild(searchIcon);
    container.appendChild(searchContainer);
  }

  tabela.parentElement.insertBefore(container, tabela);

  const filteredProdutos = filtroStatus === 'todos' ? 
    filtrarProdutos(filtroStatus) : 
    produtos.filter(p => p.status === filtroStatus);

  filteredProdutos.forEach((produto, i) => {
    const tr = document.createElement("tr");
    const validOptions = ['backup', 'operacao', 'necessario', 'manutencao'].filter(opt => opt !== produto.status);
    tr.innerHTML = `
      <td ${filtroStatus === 'todos' ? `onclick="mostrarDetalhesProduto(${i})" style="cursor: pointer;"` : ''}>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.categoria}</td>
      <td>R$ ${produto.valor.toFixed(2)}</td>
      <td>${produto.status}</td>
      <td>${produto.email || 'N/A'}</td>
      <td>${produto.jogo || 'N/A'}</td>
      <td>
        ${validOptions.map(opt => `
          <button onclick="mostrarModalTransferencia(${i}, '${opt}', '${filtroStatus}')">${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : opt === 'necessario' ? '🔩 Necessário OPS' : '📦 Backup'}</button>
        `).join('')}
        <button onclick="excluirProduto(${i}, '${filtroStatus}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarProdutos(filtroStatus) {
  const searchTerm = document.querySelector('.search-bar')?.value.toLowerCase() || '';
  return produtos.filter(p => 
    (p.status === filtroStatus || filtroStatus === 'todos') &&
    (p.nome.toLowerCase().includes(searchTerm) || p.categoria.toLowerCase().includes(searchTerm))
  );
}

function mostrarModalTransferencia(i, novoStatus, filtroStatus) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Transferir "${produtos[i].nome}" para ${novoStatus}</h3>
      ${novoStatus === 'manutencao' ? `
        <label>Defeito:</label><input id="defeito" type="text" value="${produtos[i].defeito || ''}"><br>
        <label>Local de Conserto:</label><input id="localConserto" type="text" value="${produtos[i].localConserto || ''}"><br>
        <label>Custo Estimado:</label><input id="custoManutencao" type="number" step="0.01" value="${produtos[i].custoManutencao || 0}"><br>
        <label>Agendamento (opcional):</label><input id="agendamento" type="text" value="${produtos[i].agendamento || ''}"><br>
      ` : `
        <label>Motivo da Transferência:</label><input id="motivo" type="text"><br>
      `}
      <button id="confirmTransferButton">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmTransferButton');
  confirmButton.addEventListener('click', () => confirmarTransferencia(i, novoStatus, filtroStatus));
}

function confirmarTransferencia(i, novoStatus, filtroStatus) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  let detalhes = {};
  if (novoStatus === 'manutencao') {
    detalhes.defeito = document.getElementById('defeito')?.value || "";
    detalhes.localConserto = document.getElementById('localConserto')?.value || "";
    detalhes.custoManutencao = parseFloat(document.getElementById('custoManutencao')?.value || 0);
    detalhes.agendamento = document.getElementById('agendamento')?.value || "";
  } else {
    detalhes.motivo = document.getElementById('motivo')?.value || "";
  }

  const statusAtual = produtos[i].status;
  produtos[i].status = novoStatus;
  if (novoStatus === 'manutencao') {
    produtos[i].defeito = detalhes.defeito;
    produtos[i].localConserto = detalhes.localConserto;
    produtos[i].custoManutencao = detalhes.custoManutencao;
    produtos[i].agendamento = detalhes.agendamento;
  } else {
    produtos[i].defeito = "";
    produtos[i].localConserto = "";
    produtos[i].custoManutencao = 0;
    produtos[i].agendamento = "";
    produtos[i].motivoTransferencia = detalhes.motivo;
  }

  produtos[i].historicoTransferencias = produtos[i].historicoTransferencias || [];
  produtos[i].historicoTransferencias.push({
    de: statusAtual,
    para: novoStatus,
    data: new Date().toLocaleString(),
    detalhes
  });

  setDoc(doc(window.db, "produtos", produtos[i].id), produtos[i]).then(() => {
    document.querySelector('.modal')?.remove();
    atualizarDashboard();
    if (filtroStatus === 'categoria') {
      filtrarPorCategoria(produtos[i].categoria, categorias.find(c => c.nome === produtos[i].categoria)?.id || '');
    } else if (filtroStatus !== 'todos') {
      listarProdutos(filtroStatus);
      if (novoStatus === 'manutencao') carregarManutencao();
    } else {
      listarProdutos(filtroStatus);
      listarProdutosPainel();
    }
  }).catch((error) => {
    console.error("Erro ao transferir produto:", error);
    alert("Falha ao transferir produto no Firebase.");
  });
}

function mostrarDetalhesProduto(i) {
  const secao = document.getElementById("secao-todos");
  if (secao) {
    secao.style.display = "block";
    document.querySelectorAll("main > section:not(#secao-todos)").forEach(s => s.style.display = "none");
    secao.innerHTML = `
      <div class="table-section">
        <button class="back-button" onclick="mostrarSecao('painel')">⬅️ Voltar</button>
        <h3>Detalhes do Produto: ${produtos[i].nome}</h3>
        <div class="product-details">
          <p><strong>Nome:</strong> ${produtos[i].nome}</p>
          <p><strong>Quantidade:</strong> ${produtos[i].quantidade}</p>
          <p><strong>Categoria:</strong> ${produtos[i].categoria || 'N/A'}</p>
          <p><strong>Valor Unitário:</strong> R$ ${produtos[i].valor.toFixed(2)}</p>
          <p><strong>Status:</strong> ${produtos[i].status}</p>
          <p><strong>Email:</strong> ${produtos[i].email || 'N/A'}</p>
          <p><strong>Jogo:</strong> ${produtos[i].jogo || 'N/A'}</p>
          ${produtos[i].status === 'manutencao' ? `
            <p><strong>Defeito:</strong> ${produtos[i].defeito || 'N/A'}</p>
            <p><strong>Local de Conserto:</strong> ${produtos[i].localConserto || 'N/A'}</p>
            <p><strong>Custo de Manutenção:</strong> R$ ${produtos[i].custoManutencao.toFixed(2)}</p>
            <p><strong>Agendamento:</strong> ${produtos[i].agendamento || 'N/A'}</p>
          ` : ''}
          <p><strong>Histórico de Transferências:</strong></p>
          <ul>
            ${produtos[i].historicoTransferencias?.map(t => `
              <li>${t.data}: De ${t.de} para ${t.para} - ${t.detalhes.motivo || t.detalhes.defeito || 'Sem detalhes'}</li>
            `).join('') || '<li>Nenhum histórico</li>'}
          </ul>
          <div class="action-buttons">
            ${['backup', 'operacao', 'necessario', 'manutencao'].filter(s => s !== produtos[i].status).map(opt => `
              <button onclick="mostrarModalTransferencia(${i}, '${opt}', 'todos')"> ${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : opt === 'necessario' ? '🔩 Necessário OPS' : '📦 Backup'}</button>
            `).join('')}
            <button onclick="excluirProduto(${i}, 'todos')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }
}

function excluirProduto(i, filtroStatus) {
  if (confirm("Deseja realmente excluir este produto?") && typeof window.db !== 'undefined' && window.db && window.firestoreFunctions) {
    const { doc, deleteDoc } = window.firestoreFunctions;
    deleteDoc(doc(window.db, "produtos", produtos[i].id)).then(() => {
      produtos.splice(i, 1);
      atualizarListas();
      atualizarDashboard();
      listarProdutosPainel();
      if (filtroStatus === 'categoria') {
        filtrarPorCategoria(produtos[i]?.categoria, categorias.find(c => c.nome === produtos[i]?.categoria)?.id || '');
      } else if (filtroStatus === 'manutencao') {
        carregarManutencao();
      } else {
        listarProdutos(filtroStatus);
      }
    }).catch((error) => {
      console.error("Erro ao excluir produto:", error);
      alert("Falha ao excluir produto do Firebase.");
    });
  }
}

function mostrarDetalhesReceita() {
  const produtoContagem = {};
  let totalReceita = 0;

  produtos.forEach(p => {
    produtoContagem[p.nome] = (produtoContagem[p.nome] || 0) + p.quantidade;
    totalReceita += p.quantidade * p.valor;
  });

  const detalhes = Object.entries(produtoContagem)
    .map(([nome, qtd]) => `${nome}: ${qtd} unidades`)
    .join('\n');

  alert(`Detalhes da Receita:\nTotal: R$ ${totalReceita.toFixed(2)}\n\nProdutos:\n${detalhes || 'Nenhum produto registrado.'}`);
}

function atualizarDashboard() {
  const totalBackup = produtos.filter(p => p.status === 'backup').reduce((sum, p) => sum + p.quantidade, 0);
  const totalOperacao = produtos.filter(p => p.status === 'operacao').reduce((sum, p) => sum + p.quantidade, 0);
  const totalProdutos = produtos.length;

  const backupElement = document.querySelector('#secao-painel .stats div:nth-child(1) strong');
  const produtosElement = document.querySelector('#secao-painel .stats div:nth-child(2) strong');
  const receitaElement = document.querySelector('#cardReceita p');
  const backupCardElement = document.querySelector('#cardBackup p');
  const operacaoCardElement = document.querySelector('#cardOperacao p');

  if (backupElement) backupElement.textContent = totalBackup.toLocaleString();
  if (produtosElement) produtosElement.textContent = totalProdutos.toLocaleString();
  if (receitaElement) receitaElement.textContent = `R$ ${produtos.reduce((sum, p) => sum + p.quantidade * p.valor, 0).toFixed(2)}`;
  if (backupCardElement) backupCardElement.textContent = totalBackup.toLocaleString();
  if (operacaoCardElement) operacaoCardElement.textContent = totalOperacao.toLocaleString();
}

function carregarManutencao() {
  const tabela = document.getElementById("tabelaProdutosManutencao");
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  produtos
    .filter(p => p.status === 'manutencao')
    .forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.defeito || 'N/A'}</td>
        <td><input type="text" value="${p.localConserto || ''}" onchange="atualizarLocalConserto('${p.id}', this.value)"></td>
        <td>R$ ${p.custoManutencao.toFixed(2)}</td>
        <td>${p.agendamento || 'N/A'}</td>
        <td>${p.email || 'N/A'}</td>
        <td>${p.jogo || 'N/A'}</td>
        <td>
          <button onclick="mostrarModalTransferencia(${i}, 'operacao', 'manutencao')">🚀 Operação</button>
          <button onclick="mostrarModalTransferencia(${i}, 'backup', 'manutencao')">📦 Backup</button>
          <button onclick="mostrarModalTransferencia(${i}, 'necessario', 'manutencao')">🔩 Necessário OPS</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function atualizarLocalConserto(id, novoValor) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === id);
  if (produto) {
    produto.localConserto = novoValor;
    setDoc(doc(window.db, "produtos", produto.id), produto).catch((error) => {
      console.error("Erro ao atualizar local de conserto:", error);
      alert("Falha ao atualizar local de conserto no Firebase.");
    });
  }
}

function atualizarListas() {
  const secaoAtiva = document.querySelector("main > section[style*='block']")?.id.replace('secao-', '');
  if (secaoAtiva === 'manutencao') carregarManutencao();
  else if (['backup', 'operacao', 'necessario', 'todos'].includes(secaoAtiva)) listarProdutos(secaoAtiva);
  else if (secaoAtiva === 'categoria-detalhes') filtrarPorCategoria(produtos[0]?.categoria || '', categorias.find(c => c.nome === produtos[0]?.categoria)?.id || '');
  else if (secaoAtiva === 'painel') listarProdutosPainel();
}

window.confirmarCriarProduto = confirmarCriarProduto;
window.mostrarModalCriarProduto = mostrarModalCriarProduto;
window.excluirProduto = excluirProduto;
window.listarProdutos = listarProdutos;
window.mostrarDetalhesProduto = mostrarDetalhesProduto;
window.mostrarModalTransferencia = mostrarModalTransferencia;
window.mostrarSecao = mostrarSecao;
window.excluirCategoria = excluirCategoria;
window.mostrarModalExcluirCategoria = mostrarModalExcluirCategoria;
window.atualizarCategoriaProduto = atualizarCategoriaProduto;