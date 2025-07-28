/* @ts-nocheck */
let produtos = [];
let categorias = [];
let navigationHistory = ['painel'];
let listaCompras = { sheets: { 'Sheet1': [] } }; // Estrutura para múltiplas abas
let currentSheet = 'Sheet1';

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

  // Configurar o evento onchange para o filtro de categoria
  const filtroCategoria = document.getElementById('filtroCategoria');
  if (filtroCategoria) {
    filtroCategoria.onchange = (e) => {
      const valorFiltro = e.target.value;
      localStorage.setItem('filtroCategoria', valorFiltro); // Salvar o filtro
      console.log("Filtro alterado para:", valorFiltro); // Depuração
      atualizarDashboard(valorFiltro);
    };

    // Restaurar o filtro salvo ao carregar a página
    const filtroSalvo = localStorage.getItem('filtroCategoria') || '';
    if (filtroSalvo && filtroCategoria.options) {
      filtroCategoria.value = filtroSalvo;
      console.log("Filtro restaurado de localStorage:", filtroSalvo); // Depuração
    }
  }

  if (typeof window.db !== 'undefined' && window.db && window.firestoreFunctions && window.storageFunctions) {
    carregarProdutosFirestore();
    carregarCategorias();
    carregarListaCompras(); // Carregar lista de compras
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

  const nomes = ['painel', 'categorias', 'backup', 'operacao', 'necessario', 'manutencao', 'todos', 'sobre'];
  const index = nomes.indexOf(secao);
  if (index >= 0) itens[index].classList.add("active");

  const currentSection = navigationHistory[navigationHistory.length - 1];
  if (secao !== currentSection) {
    navigationHistory.push(secao);
    if (navigationHistory.length > 10) navigationHistory.shift();
  }

  if (['backup', 'operacao', 'necessario', 'todos'].includes(secao)) {
    const status = secao === 'operacao' ? 'operacao' :
                   secao === 'necessario' ? 'necessario' :
                   secao === 'todos' ? 'todos' : 'backup';
    listarProdutos(status);
  }

  if (secao === 'painel') {
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);
  }
  if (secao === 'manutencao') carregarManutencao();
  if (secao === 'categorias') carregarCategorias();
  if (secao === 'necessario') atualizarListaCompras();
}

function voltar() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop();
    const previousSection = navigationHistory[navigationHistory.length - 1];
    if (typeof previousSection === 'string') {
      mostrarSecao(previousSection);
    } else if (previousSection.secao === 'categoria-detalhes') {
      filtrarPorCategoria(previousSection.nomeCategoria, previousSection.categoriaId);
    } else {
      mostrarSecao('painel');
    }
  } else {
    mostrarSecao('painel');
  }
}

function mostrarModalCriarCategoria() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Criar Novo Andar</h3>
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
      const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
      listarProdutosPainel(filtroCategoria);
      atualizarFiltroCategoria();
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
      const data = doc.id;
      categorias.push({ id: doc.id, ...doc.data() });
      const card = document.createElement("div");
      card.className = "categoria-card";
      card.innerHTML = `
        <img src="${doc.data().icon || 'https://api.iconify.design/mdi:help-circle.svg'}?width=48&height=48" class="categoria-icon" alt="${doc.data().nome}">
        <div>
          <strong>${doc.data().nome}</strong><br>
          <small>Responsável: ${doc.data().responsavel || 'N/A'}</small>
        </div>
      `;
      const newCard = card.cloneNode(true);
      card.replaceWith(newCard);
      newCard.onclick = () => filtrarPorCategoria(doc.data().nome, doc.id);
      container.appendChild(newCard);
    });
    atualizarFiltroCategoria();
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    listarProdutosPainel(filtroCategoria);
  }).catch(error => {
    console.error("Erro ao carregar categorias:", error);
    alert("Falha ao carregar categorias do Firebase.");
  });
}

function atualizarFiltroCategoria() {
  const filtroCategoria = document.getElementById('filtroCategoria');
  if (!filtroCategoria) return;
  const valorSalvo = localStorage.getItem('filtroCategoria') || '';
  filtroCategoria.innerHTML = '<option value="">Todos os Andares</option>';
  categorias.forEach(c => {
    const option = document.createElement('option');
    option.value = c.nome;
    option.textContent = c.nome;
    if (c.nome === valorSalvo) option.selected = true; // Restaurar o valor salvo
    filtroCategoria.appendChild(option);
  });
}

function filtrarPorCategoria(nomeCategoria, categoriaId) {
  const produtosFiltrados = produtos.filter(p => p.categoria === nomeCategoria);
  const secao = document.getElementById("secao-categoria-detalhes");
  secao.style.display = "block";
  document.querySelectorAll("main > section:not(#secao-categoria-detalhes)").forEach(s => s.style.display = "none");

  const tabela = document.getElementById("tabelaProdutosCategoria");
  tabela.innerHTML = "";
  secao.querySelector('h3').textContent = `Detalhes do Andar: ${nomeCategoria}`;

  const existingHeader = tabela.parentElement.querySelector('.table-header');
  if (existingHeader) existingHeader.remove();
  const existingActionBar = tabela.parentElement.querySelector('.category-action-bar');
  if (existingActionBar) existingActionBar.remove();

  const header = document.createElement("div");
  header.className = "table-header";
  header.innerHTML = `
    <button class="back-button" onclick="voltar()">⬅️ Voltar</button>
    <button class="criar-produto" onclick="mostrarModalCriarProduto('categoria', '${nomeCategoria}')">Adicionar Item</button>
  `;
  tabela.parentElement.insertBefore(header, tabela);

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Item</th>
      <th>Identificador</th>
      <th>Local de Conserto</th>
      <th>Menu</th>
    </tr>
  `;
  tabela.appendChild(thead);

  const tbody = document.createElement("tbody");
  produtosFiltrados.forEach((produto) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.localConserto || 'N/A'}</td>
      <td class="menu-container">
        <div class="menu-label"></div>
        <button class="menu-button" onclick="toggleMenu(this)">≡</button>
        <div class="menu-options" style="display: none;">
          <button onclick="mostrarModalSobre('${produto.id}')">Sobre</button>
          <button onclick="mostrarModalEnviarItem('${produto.id}', 'categoria')">Enviar Item</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tabela.appendChild(tbody);

  const actionBar = document.createElement("div");
  actionBar.className = "category-action-bar";
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-category-btn";
  deleteButton.textContent = "Excluir Andar";
  deleteButton.onclick = () => excluirCategoria(categoriaId, nomeCategoria);
  actionBar.appendChild(deleteButton);
  tabela.parentElement.appendChild(actionBar);

  const currentSection = navigationHistory[navigationHistory.length - 1];
  if (currentSection !== 'categoria-detalhes') {
    navigationHistory.push({ secao: 'categoria-detalhes', nomeCategoria, categoriaId });
    if (navigationHistory.length > 10) navigationHistory.shift();
  }
}

function mostrarModalExcluirCategoria() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Excluir Andar</h3>
      <label>Selecione a Categoria:</label>
      <select id="categoriaExcluir" required>
        <option value="">Selecione um andar</option>
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
      alert("Por favor, selecione um andar.");
      return;
    }
    excluirCategoria(categoriaId, categoria.nome);
  });
}

function excluirCategoria(categoriaId, nomeCategoria) {
  if (confirm(`Deseja realmente excluir o andar "${nomeCategoria}"? Os itens associados permanecerão, mas sem andar.`)) {
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
            alert("Andar excluído com sucesso! Itens associados agora estão sem andar.");
            document.querySelector('.modal')?.remove();
            carregarCategorias();
            const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
            listarProdutosPainel(filtroCategoria);
            atualizarFiltroCategoria();
            const secao = document.getElementById("secao-categoria-detalhes");
            if (secao) secao.style.display = "none";
            mostrarSecao('painel');
          })
          .catch(error => {
            console.error("Erro ao excluir andar:", error);
            alert("Falha ao excluir andar.");
          });
      })
      .catch(error => {
        console.error("Erro ao atualizar itens:", error);
        alert("Falha ao atualizar itens associados.");
      });
  }
}

function mostrarModalCriarProduto(status, categoriaPreenchida = '') {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Criar Novo Item</h3>
      <label>Nome:</label><input id="nome" type="text" required><br>
      <label>Identificador:</label><input id="identificador" type="text" required><br>
      <label>Quantidade:</label><input id="quantidade" type="number" min="1" required><br>
      <label>Andar:</label><input id="categoria" type="text" value="${categoriaPreenchida}" required><br>
      <label>Valor Unitário:</label><input id="valor" type="number" step="0.01" min="0" required><br>
      <label>Status:</label>
      <select id="status" required>
        <option value="backup">Backup</option>
        <option value="operacao">Operação</option>
        <option value="necessario">Lista de Compras</option>
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
  confirmButton.addEventListener('click', () => confirmarCriarProduto(status, categoriaPreenchida));
}

function confirmarCriarProduto(status, categoriaPreenchida) {
  const nome = document.getElementById('nome')?.value.trim();
  const identificador = document.getElementById('identificador')?.value.trim();
  const quantidade = parseInt(document.getElementById('quantidade')?.value || 1);
  const categoria = document.getElementById('categoria')?.value.trim();
  const valor = parseFloat(document.getElementById('valor')?.value || 0);
  const selectedStatus = document.getElementById('status')?.value;
  const email = document.getElementById('email')?.value.trim() || '';
  const jogo = document.getElementById('jogo')?.value.trim() || '';

  if (!nome || !identificador || quantidade < 1 || !categoria || valor < 0 || !selectedStatus) {
    alert("Por favor, preencha todos os campos obrigatórios corretamente.");
    return;
  }

  if (typeof window.db === 'undefined' || !window.db || !window.firestoreFunctions) {
    alert("Erro: Firebase não está inicializado.");
    return;
  }

  const { collection, addDoc } = window.firestoreFunctions;
  const novoProduto = {
    nome,
    identificador,
    quantidade: 1,
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

  const createPromises = [];
  for (let i = 0; i < quantidade; i++) {
    createPromises.push(
      addDoc(collection(window.db, "produtos"), { ...novoProduto })
        .then(docRef => ({ ...novoProduto, id: docRef.id }))
        .catch(error => {
          console.error("Erro ao adicionar item:", error);
          throw new Error("Falha ao adicionar item ao Firebase.");
        })
    );
  }

  Promise.all(createPromises).then(newProducts => {
    newProducts.forEach(produto => produtos.push(produto));
    document.querySelector('.modal')?.remove();
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);

    const secaoAtiva = document.querySelector("main > section[style*='block']")?.id.replace('secao-', '');
    if (secaoAtiva === 'categoria-detalhes' && categoriaPreenchida === novoProduto.categoria) {
      filtrarPorCategoria(novoProduto.categoria, categorias.find(c => c.nome === novoProduto.categoria)?.id || '');
    } else if (secaoAtiva === 'manutencao' && novoProduto.status === 'manutencao') {
      carregarManutencao();
    } else if (['backup', 'operacao', 'necessario', 'todos'].includes(secaoAtiva) && novoProduto.status === status) {
      listarProdutos(status);
    } else if (secaoAtiva === 'painel') {
      listarProdutosPainel(filtroCategoria);
    }
  }).catch(error => {
    console.error("Erro ao criar itens:", error);
    alert(error.message);
  });
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
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);
  }).catch((error) => {
    console.error("Erro ao carregar itens:", error);
    alert("Erro ao carregar itens do Firebase.");
  });
}

function atualizarProdutoFirestore(produto) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  setDoc(doc(window.db, "produtos", produto.id), produto).then(() => {
    const index = produtos.findIndex(p => p.id === produto.id);
    if (index !== -1) produtos[index] = produto;
    atualizarListas();
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);
  }).catch((error) => {
    console.error("Erro ao atualizar item:", error);
    alert("Falha ao atualizar item no Firebase.");
  });
}

function listarProdutosPainel(filtroCategoria = '') {
  const tabela = document.getElementById("tabelaProdutosPainel");
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  const produtosFiltrados = filtroCategoria ? produtos.filter(p => p.categoria === filtroCategoria) : produtos;

  if (produtosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Nenhum item encontrado para este andar.</td></tr>';
    return;
  }

  produtosFiltrados.forEach((produto) => {
    const tr = document.createElement("tr");
    const opcoesStatus = ['backup', 'operacao', 'necessario', 'manutencao']
      .filter(opt => opt !== produto.status)
      .map(opt => `
        <div onclick="mostrarModalTransferencia('${produto.id}', '${opt}', 'todos')">
          ${opt === 'manutencao' ? 'Enviar para > Manutenção' :
          opt === 'operacao' ? 'Enviar para > Operação' :
          opt === 'necessario' ? 'Enviar para > Lista de Compras' :
          'Enviar para > Backup'}
        </div>
      `).join('');

    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>
        <select onchange="atualizarCategoriaProduto('${produto.id}', this.value)">
          <option value="">Sem andar</option>
          ${categorias.map(c => `<option value="${c.nome}" ${produto.categoria === c.nome ? 'selected' : ''}>${c.nome}</option>`).join('')}
        </select>
      </td>
      <td class="menu-container">
        <div class="menu-label"></div>
        <button class="menu-button" onclick="toggleMenu(this)">≡</button>
        <div class="menu-options" style="display: none;">
          <button onclick="mostrarModalSobre('${produto.id}')">Sobre</button>
          <button onclick="mostrarModalEnviarItem('${produto.id}', 'todos')">Enviar Item</button>
        </div>
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
        const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
        listarProdutosPainel(filtroCategoria);
        atualizarListas();
        atualizarDashboard(filtroCategoria);
      })
      .catch(error => {
        console.error("Erro ao atualizar andar do item:", error);
        alert("Falha ao atualizar andar do item.");
      });
  }
}

function filtrarProdutos(filtroStatus) {
  const searchTerm = document.querySelector('#secao-todos .search-bar')?.value.toLowerCase() || '';
  const regex = new RegExp(searchTerm.split('').join('.*'), 'i');
  return produtos.filter(p => 
    (p.status === filtroStatus || filtroStatus === 'todos') &&
    (regex.test(p.nome) || regex.test(p.categoria || ''))
  );
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

  let container = tabela.parentElement.querySelector('.table-header');
  if (!container) {
    container = document.createElement("div");
    container.className = "table-header";
    const botaoCriar = document.createElement("button");
    botaoCriar.textContent = "Adicionar Item";
    botaoCriar.className = "criar-produto";
    botaoCriar.setAttribute('aria-label', 'Criar novo item');
    botaoCriar.onclick = () => mostrarModalCriarProduto(filtroStatus);
    container.appendChild(botaoCriar);

    if (filtroStatus === 'todos') {
      const searchContainer = document.createElement("div");
      searchContainer.className = "search-container";
      const searchBar = document.createElement("input");
      searchBar.type = "text";
      searchBar.placeholder = "Pesquisar...";
      searchBar.className = "search-bar";
      searchBar.id = "searchBarTodos";
      const searchIcon = document.createElement("span");
      searchIcon.className = "search-icon";
      searchIcon.innerHTML = "🔍";
      searchIcon.setAttribute('aria-label', 'Pesquisar itens');
      searchContainer.appendChild(searchBar);
      searchContainer.appendChild(searchIcon);
      container.appendChild(searchContainer);
    }

    tabela.parentElement.insertBefore(container, tabela);
  }

  if (filtroStatus === 'todos') {
    const searchBar = document.getElementById('searchBarTodos');
    if (searchBar && !searchBar.dataset.listenerAdded) {
      searchBar.dataset.listenerAdded = 'true';
      searchBar.oninput = debounce(() => listarProdutos(filtroStatus), 300);
    }
  }

  const filteredProdutos = filtroStatus === 'todos' ? 
    filtrarProdutos(filtroStatus) : 
    produtos.filter(p => p.status === filtroStatus);

  filteredProdutos.forEach((produto) => {
    const tr = document.createElement("tr");
    const validOptions = ['backup', 'operacao', 'necessario', 'manutencao'].filter(opt => opt !== produto.status);
    tr.innerHTML = `
      <td>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.categoria}</td>
      <td>${produto.localConserto || 'N/A'}</td>
      <td class="menu-container">
        <div class="menu-label">Menu</div>
        <button class="menu-button" onclick="toggleMenu(this)">≡</button>
        <div class="menu-options" style="display: none;">
          <button onclick="mostrarModalSobre('${produto.id}')">Sobre</button>
          <button onclick="mostrarModalEnviarItem('${produto.id}', '${filtroStatus}')">Enviar Item</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function carregarListaCompras() {
  if (!window.db || !window.firestoreFunctions) return;
  const { collection, getDocs } = window.firestoreFunctions;
  getDocs(collection(window.db, "listaCompras")).then((querySnapshot) => {
    listaCompras.sheets = { 'Sheet1': [] }; // Resetar abas
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.sheet && data.items) {
        listaCompras.sheets[data.sheet] = data.items;
      }
    });
    atualizarListaCompras();
  }).catch((error) => {
    console.error("Erro ao carregar lista de compras:", error);
    alert("Erro ao carregar lista de compras do Firebase.");
  });
}

function salvarListaCompras() {
  if (!window.db || !window.firestoreFunctions) return;
  const { collection, setDoc, doc } = window.firestoreFunctions;
  Object.keys(listaCompras.sheets).forEach(sheet => {
    setDoc(doc(window.db, "listaCompras", sheet), { sheet, items: listaCompras.sheets[sheet] })
      .catch((error) => {
        console.error("Erro ao salvar aba:", error);
        alert("Falha ao salvar aba no Firebase.");
      });
  });
}

function adicionarNovaAba() {
  const novaAba = `Sheet${Object.keys(listaCompras.sheets).length + 1}`;
  listaCompras.sheets[novaAba] = [];
  atualizarListaCompras();
  salvarListaCompras();
}

function atualizarListaCompras() {
  const tabela = document.getElementById("tabelaProdutosNecessario");
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  // Adicionar seleção de abas
  const sheetSelector = document.createElement('select');
  sheetSelector.id = 'sheetSelector';
  Object.keys(listaCompras.sheets).forEach(sheet => {
    const option = document.createElement('option');
    option.value = sheet;
    option.textContent = sheet;
    if (sheet === currentSheet) option.selected = true;
    sheetSelector.appendChild(option);
  });
  sheetSelector.onchange = (e) => {
    currentSheet = e.target.value;
    atualizarListaCompras();
  };

  const addSheetButton = document.createElement('button');
  addSheetButton.textContent = 'Nova Aba';
  addSheetButton.onclick = adicionarNovaAba;

  const header = tabela.parentElement.querySelector('.table-header');
  if (header) {
    header.innerHTML = '';
    header.appendChild(sheetSelector);
    header.appendChild(addSheetButton);
    const botaoCriar = document.createElement("button");
    botaoCriar.textContent = "Adicionar Item";
    botaoCriar.className = "criar-produto";
    botaoCriar.setAttribute('aria-label', 'Criar novo item');
    botaoCriar.onclick = () => mostrarModalCriarItemListaCompras();
    header.appendChild(botaoCriar);
  }

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Item</th>
      <th>Quantidade</th>
      <th>Preço Estimado</th>
      <th>Prioridade</th>
      <th>Ações</th>
    </tr>
  `;
  tabela.innerHTML = '';
  tabela.appendChild(thead);
  tabela.appendChild(tbody);

  listaCompras.sheets[currentSheet].forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${item.nome || ''}" onchange="atualizarItemListaCompras('${currentSheet}', ${index}, 'nome', this.value)"></td>
      <td><input type="number" value="${item.quantidade || 1}" min="1" onchange="atualizarItemListaCompras('${currentSheet}', ${index}, 'quantidade', this.value)"></td>
      <td><input type="number" step="0.01" value="${item.preco || 0}" min="0" onchange="atualizarItemListaCompras('${currentSheet}', ${index}, 'preco', this.value)"></td>
      <td><input type="text" value="${item.prioridade || ''}" onchange="atualizarItemListaCompras('${currentSheet}', ${index}, 'prioridade', this.value)"></td>
      <td><button onclick="excluirItemListaCompras('${currentSheet}', ${index})">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function mostrarModalCriarItemListaCompras() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Adicionar Item à Lista de Compras</h3>
      <label>Nome:</label><input id="nomeItem" type="text" required><br>
      <label>Quantidade:</label><input id="quantidadeItem" type="number" min="1" value="1" required><br>
      <label>Preço Estimado:</label><input id="precoItem" type="number" step="0.01" min="0" value="0" required><br>
      <label>Prioridade (opcional):</label><input id="prioridadeItem" type="text"><br>
      <button id="confirmButton">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmButton');
  confirmButton.addEventListener('click', () => {
    const nome = document.getElementById('nomeItem')?.value.trim();
    const quantidade = parseInt(document.getElementById('quantidadeItem')?.value || 1);
    const preco = parseFloat(document.getElementById('precoItem')?.value || 0);
    const prioridade = document.getElementById('prioridadeItem')?.value.trim() || '';

    if (!nome || quantidade < 1 || preco < 0) {
      alert("Por favor, preencha todos os campos obrigatórios corretamente.");
      return;
    }

    listaCompras.sheets[currentSheet].push({ nome, quantidade, preco, prioridade });
    document.querySelector('.modal')?.remove();
    atualizarListaCompras();
    salvarListaCompras();
  });
}

function atualizarItemListaCompras(sheet, index, campo, valor) {
  if (listaCompras.sheets[sheet] && listaCompras.sheets[sheet][index]) {
    listaCompras.sheets[sheet][index][campo] = valor;
    salvarListaCompras();
  }
}

function excluirItemListaCompras(sheet, index) {
  if (confirm("Deseja realmente excluir este item?")) {
    listaCompras.sheets[sheet].splice(index, 1);
    atualizarListaCompras();
    salvarListaCompras();
  }
}

function mostrarModalTransferencia(produtoId, novoStatus) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  let modalContent = '';
  if (novoStatus === 'manutencao') {
    modalContent = `
      <h3>Transferir "${produto.nome}" para Manutenção</h3>
      <label>Defeito:</label><input id="defeito" type="text" required><br>
      <label>Local de conserto:</label><input id="localConserto" type="text" required><br>
      <button id="salvarButton">Salvar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    `;
  } else if (novoStatus === 'backup' && produto.status !== 'manutencao') {
    modalContent = `
      <h3>Transferir "${produto.nome}" para Backup</h3>
      <label>Motivo:</label><input id="motivo" type="text" required><br>
      <button id="salvarButton">Salvar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    `;
  } else if (produto.status === 'manutencao' && (novoStatus === 'operacao' || novoStatus === 'backup')) {
    modalContent = `
      <h3>Transferir "${produto.nome}" para ${novoStatus === 'operacao' ? 'Operação' : 'Backup'}</h3>
      <label>Local de conserto:</label><input id="localConserto" type="text" required><br>
      <label>Valor:</label><input id="valorConserto" type="number" step="0.01" min="0" required><br>
      <label>Data:</label><input id="dataConserto" type="date" required><br>
      <label>Condição do óculos:</label><input id="condicaoOculos" type="text" required><br>
      <button id="salvarButton">Salvar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    `;
  } else if (produto.status === 'operacao' && novoStatus === 'backup') {
    modalContent = `
      <h3>Transferir "${produto.nome}" para Backup</h3>
      <label>Motivo:</label><input id="motivo" type="text" required><br>
      <label>Local de conserto:</label><input id="localConserto" type="text" required><br>
      <button id="salvarButton">Salvar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    `;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content">${modalContent}</div>`;
  document.body.appendChild(modal);

  const salvarButton = modal.querySelector('#salvarButton');
  salvarButton.addEventListener('click', () => confirmarTransferencia(produtoId, novoStatus));
}

function confirmarTransferencia(produtoId, novoStatus) {
  if (!window.db || !window.firestoreFunctions) {
    console.error("Firebase não inicializado para transferência.");
    alert("Erro: Firebase não inicializado.");
    return;
  }

  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  let detalhes = {};
  if (novoStatus === 'manutencao') {
    detalhes.defeito = document.getElementById('defeito')?.value.trim();
    detalhes.localConserto = document.getElementById('localConserto')?.value.trim();
    if (!detalhes.defeito || !detalhes.localConserto) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
  } else if (novoStatus === 'backup' && produto.status !== 'manutencao') {
    detalhes.motivo = document.getElementById('motivo')?.value.trim();
    if (!detalhes.motivo) {
      alert("Por favor, preencha o motivo.");
      return;
    }
  } else if (produto.status === 'manutencao' && (novoStatus === 'operacao' || novoStatus === 'backup')) {
    detalhes.localConserto = document.getElementById('localConserto')?.value.trim();
    detalhes.valorConserto = parseFloat(document.getElementById('valorConserto')?.value || 0);
    detalhes.dataConserto = document.getElementById('dataConserto')?.value;
    detalhes.condicaoOculos = document.getElementById('condicaoOculos')?.value.trim();
    if (!detalhes.localConserto || !detalhes.valorConserto || !detalhes.dataConserto || !detalhes.condicaoOculos) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
  } else if (produto.status === 'operacao' && novoStatus === 'backup') {
    detalhes.motivo = document.getElementById('motivo')?.value.trim();
    detalhes.localConserto = document.getElementById('localConserto')?.value.trim();
    if (!detalhes.motivo || !detalhes.localConserto) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
  }

  const statusAtual = produto.status;
  produto.status = novoStatus;
  if (novoStatus === 'manutencao') {
    produto.defeito = detalhes.defeito;
    produto.localConserto = detalhes.localConserto;
    produto.custoManutencao = 0;
    produto.agendamento = '';
  } else if (produto.status === 'manutencao' && (novoStatus === 'operacao' || novoStatus === 'backup')) {
    produto.defeito = '';
    produto.localConserto = detalhes.localConserto;
    produto.custoManutencao = detalhes.valorConserto;
    produto.agendamento = detalhes.dataConserto;
    produto.condicao = detalhes.condicaoOculos;
  } else {
    produto.defeito = '';
    produto.localConserto = detalhes.localConserto;
    produto.custoManutencao = 0;
    produto.agendamento = '';
    produto.condicao = '';
  }

  produto.historicoTransferencias = produto.historicoTransferencias || [];
  produto.historicoTransferencias.push({
    de: statusAtual,
    para: novoStatus,
    data: new Date().toLocaleString(),
    detalhes
  });

  console.log("Atualizando item no Firebase:", produto);
  setDoc(doc(window.db, "produtos", produto.id), produto).then(() => {
    console.log("Item atualizado com sucesso no Firebase:", produto.id);
    document.querySelector('.modal')?.remove();
    window.location.reload(); // Recarrega a página com as novas mudanças
  }).catch((error) => {
    console.error("Erro ao transferir item:", error);
    alert("Falha ao transferir item no Firebase: " + error.message);
  });
}

function mostrarDetalhesProduto(produtoId, origem) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Editar Item: ${produto.nome}</h3>
      <label>Nome:</label><input id="editNome" type="text" value="${produto.nome}" required><br>
      <label>Identificador:</label><input id="editIdentificador" type="text" value="${produto.identificador || ''}" required><br>
      <label>Quantidade:</label><input id="editQuantidade" type="number" min="1" value="${produto.quantidade}" required><br>
      <label>Andar:</label><input id="editCategoria" type="text" value="${produto.categoria}" required><br>
      <label>Valor Unitário:</label><input id="editValor" type="number" step="0.01" min="0" value="${produto.valor}" required><br>
      <label>Status:</label>
      <select id="editStatus" required>
        <option value="backup" ${produto.status === 'backup' ? 'selected' : ''}>Backup</option>
        <option value="operacao" ${produto.status === 'operacao' ? 'selected' : ''}>Operação</option>
        <option value="necessario" ${produto.status === 'necessario' ? 'selected' : ''}>Lista de Compras</option>
        <option value="manutencao" ${produto.status === 'manutencao' ? 'selected' : ''}>Manutenção</option>
      </select><br>
      <label>Email (opcional):</label><input id="editEmail" type="email" value="${produto.email || ''}"><br>
      <label>Jogo (opcional):</label><input id="editJogo" type="text" value="${produto.jogo || ''}"><br>
      ${produto.status === 'manutencao' ? `
        <label>Defeito:</label><input id="editDefeito" type="text" value="${produto.defeito || ''}"><br>
        <label>Local de Conserto:</label><input id="editLocalConserto" type="text" value="${produto.localConserto || ''}"><br>
        <label>Custo de Manutenção:</label><input id="editCustoManutencao" type="number" step="0.01" value="${produto.custoManutencao || 0}"><br>
        <label>Agendamento (opcional):</label><input id="editAgendamento" type="text" value="${produto.agendamento || ''}"><br>
      ` : ''}
      <button id="confirmEditButton">Salvar</button>
      <button onclick="excluirProduto('${produto.id}', '${origem}'); this.parentElement.parentElement.remove()">Excluir</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmEditButton');
  confirmButton.addEventListener('click', () => confirmarEditarProduto(produtoId, origem));
}

function confirmarEditarProduto(produtoId, origem) {
  if (!window.db || !window.firestoreFunctions) {
    console.error("Firebase não inicializado para edição.");
    alert("Erro: Firebase não inicializado.");
    return;
  }

  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  const nome = document.getElementById('editNome')?.value.trim();
  const identificador = document.getElementById('editIdentificador')?.value.trim();
  const quantidade = parseInt(document.getElementById('editQuantidade')?.value || 1);
  const categoria = document.getElementById('editCategoria')?.value.trim();
  const valor = parseFloat(document.getElementById('editValor')?.value || 0);
  const status = document.getElementById('editStatus')?.value;
  const email = document.getElementById('editEmail')?.value.trim() || '';
  const jogo = document.getElementById('editJogo')?.value.trim() || '';
  const defeito = document.getElementById('editDefeito')?.value || '';
  const localConserto = document.getElementById('editLocalConserto')?.value || '';
  const custoManutencao = parseFloat(document.getElementById('editCustoManutencao')?.value || 0);
  const agendamento = document.getElementById('editAgendamento')?.value || '';

  if (!nome || !identificador || quantidade < 1 || !categoria || valor < 0 || !status) {
    alert("Por favor, preencha todos os campos obrigatórios corretamente.");
    return;
  }

  produto.nome = nome;
  produto.identificador = identificador;
  produto.quantidade = quantidade;
  produto.categoria = categoria;
  produto.valor = valor;
  produto.status = status;
  produto.email = email;
  produto.jogo = jogo;
  if (status === 'manutencao') {
    produto.defeito = defeito;
    produto.localConserto = localConserto;
    produto.custoManutencao = custoManutencao;
    produto.agendamento = agendamento;
  } else {
    produto.defeito = '';
    produto.localConserto = '';
    produto.custoManutencao = 0;
    produto.agendamento = '';
  }

  console.log("Atualizando item no Firebase:", produto);
  setDoc(doc(window.db, "produtos", produto.id), produto).then(() => {
    console.log("Item atualizado com sucesso no Firebase:", produto.id);
    document.querySelector('.modal')?.remove();
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);
    const secaoAtiva = document.querySelector("main > section[style*='block']")?.id.replace('secao-', '');
    if (origem === 'categoria-detalhes') {
      filtrarPorCategoria(produto.categoria, categorias.find(c => c.nome === produto.categoria)?.id || '');
    } else if (secaoAtiva === 'manutencao' || produto.status === 'manutencao') {
      carregarManutencao();
    } else if (['backup', 'operacao', 'necessario', 'todos'].includes(origem)) {
      listarProdutos(origem);
    } else {
      listarProdutosPainel(filtroCategoria);
    }
  }).catch((error) => {
    console.error("Erro ao editar item:", error);
    alert("Falha ao editar item no Firebase: " + error.message);
  });
}

function excluirProduto(produtoId, filtroStatus) {
  if (confirm("Deseja realmente excluir este item?") && typeof window.db !== 'undefined' && window.db && window.firestoreFunctions) {
    const { doc, deleteDoc } = window.firestoreFunctions;
    const index = produtos.findIndex(p => p.id === produtoId);
    if (index === -1) {
      console.error("Item não encontrado para ID:", produtoId);
      alert("Erro: Item não encontrado.");
      return;
    }
    deleteDoc(doc(window.db, "produtos", produtoId)).then(() => {
      produtos.splice(index, 1);
      atualizarListas();
      const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
      atualizarDashboard(filtroCategoria);
      if (filtroStatus === 'categoria') {
        filtrarPorCategoria(produtos[index]?.categoria, categorias.find(c => c.nome === produtos[index]?.categoria)?.id || '');
      } else if (filtroStatus === 'manutencao') {
        carregarManutencao();
      } else {
        listarProdutos(filtroStatus);
      }
    }).catch((error) => {
      console.error("Erro ao excluir item:", error);
      alert("Falha ao excluir item do Firebase: " + error.message);
    });
  }
}

function mostrarDetalhesReceita() {
  const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
  const produtosFiltrados = filtroCategoria ? produtos.filter(p => p.categoria === filtroCategoria) : produtos;

  const produtosManutencao = produtosFiltrados.filter(p => p.status === 'manutencao');

  const produtoContagem = {};
  let totalUnidades = 0;

  produtosManutencao.forEach(p => {
    produtoContagem[p.nome] = (produtoContagem[p.nome] || 0) + p.quantidade;
    totalUnidades += p.quantidade;
  });

  const detalhes = Object.entries(produtoContagem)
    .map(([nome, qtd]) => `${nome}: ${qtd} unidades`)
    .join('\n');

  alert(`Detalhes das Unidades em Manutenção${filtroCategoria ? ` (${filtroCategoria})` : ''}:\nTotal: ${totalUnidades} unidade(s)\n\nItens:\n${detalhes || 'Nenhum item em manutenção.'}`);
}

function atualizarDashboard(filtroCategoria = '') {
  const produtosFiltrados = filtroCategoria ? produtos.filter(p => p.categoria === filtroCategoria) : produtos;
  
  const totalBackup = produtosFiltrados.filter(p => p.status === 'backup').reduce((sum, p) => sum + p.quantidade, 0);
  const totalOperacao = produtosFiltrados.filter(p => p.status === 'operacao').reduce((sum, p) => sum + p.quantidade, 0);
  const totalProdutos = produtosFiltrados.length;

  const backupElement = document.querySelector('#secao-painel .stats div:nth-child(1) strong');
  const produtosElement = document.querySelector('#secao-painel .stats div:nth-child(2) strong');
  const receitaElement = document.querySelector('#cardReceita p');
  const backupCardElement = document.querySelector('#cardBackup p');
  const operacaoCardElement = document.querySelector('#cardOperacao p');

  const totalManutencao = produtosFiltrados
    .filter(p => p.status === 'manutencao')
    .reduce((sum, p) => sum + p.quantidade, 0);

  if (backupElement) backupElement.textContent = totalBackup.toLocaleString('pt-BR');
  if (produtosElement) produtosElement.textContent = totalProdutos.toLocaleString('pt-BR');
  if (receitaElement) receitaElement.textContent = totalManutencao.toLocaleString('pt-BR');
  if (backupCardElement) backupCardElement.textContent = totalBackup.toLocaleString('pt-BR');
  if (operacaoCardElement) operacaoCardElement.textContent = totalOperacao.toLocaleString('pt-BR');

  listarProdutosPainel(filtroCategoria);
}

function carregarManutencao() {
  const tabela = document.getElementById("tabelaProdutosManutencao");
  if (!tabela) return;

  const tbody = tabela.querySelector('tbody');
  tbody.innerHTML = "";

  produtos
    .filter(p => p.status === 'manutencao')
    .forEach((produto) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${produto.nome}</td>
        <td>${produto.defeito || 'N/A'}</td>
        <td><input type="text" value="${produto.localConserto || ''}" onchange="atualizarLocalConserto('${produto.id}', this.value)"></td>
        <td>${produto.custoManutencao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${produto.agendamento || 'N/A'}</td>
        <td class="menu-container">
          <div class="menu-label">Menu</div>
          <button class="menu-button" onclick="toggleMenu(this)">≡</button>
          <div class="menu-options" style="display: none;">
            <button onclick="mostrarModalSobre('${produto.id}')">Sobre</button>
            <button onclick="mostrarModalEnviarItem('${produto.id}', 'manutencao')">Enviar Item</button>
          </div>
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
  else if (secaoAtiva === 'categoria-detalhes') {
    const nomeCategoria = document.querySelector('#secao-categoria-detalhes h3')?.textContent.replace('Detalhes do Andar: ', '');
    const categoriaId = categorias.find(c => c.nome === nomeCategoria)?.id || '';
    filtrarPorCategoria(nomeCategoria, categoriaId);
  } else if (secaoAtiva === 'painel') {
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    listarProdutosPainel(filtroCategoria);
  }
}

function toggleMenu(button) {
  // Fecha todos os menus antes de abrir o atual
  document.querySelectorAll('.menu-options').forEach(menu => {
    if (menu !== button.nextElementSibling) {
      menu.style.display = 'none';
    }
  });

  const menu = button.nextElementSibling;
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

// Fecha menus clicando fora
document.addEventListener('click', function (event) {
  if (!event.target.closest('.menu-container')) {
    document.querySelectorAll('.menu-options').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

function mostrarModalSobre(produtoId) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Editar Detalhes: ${produto.nome}</h3>
      <label>Nome:</label><input id="editNome" type="text" value="${produto.nome || ''}" required><br>
      <label>Identificador:</label><input id="editIdentificador" type="text" value="${produto.identificador || ''}"><br>
      <label>Quantidade:</label><input id="editQuantidade" type="number" min="1" value="${produto.quantidade || 1}" required><br>
      <label>Andar:</label><input id="editCategoria" type="text" value="${produto.categoria || ''}"><br>
      <label>Valor Unitário:</label><input id="editValor" type="number" step="0.01" min="0" value="${produto.valor || 0}" required><br>
      <label>Status:</label>
      <select id="editStatus" required>
        <option value="backup" ${produto.status === 'backup' ? 'selected' : ''}>Backup</option>
        <option value="operacao" ${produto.status === 'operacao' ? 'selected' : ''}>Operação</option>
        <option value="necessario" ${produto.status === 'necessario' ? 'selected' : ''}>Lista de Compras</option>
        <option value="manutencao" ${produto.status === 'manutencao' ? 'selected' : ''}>Manutenção</option>
      </select><br>
      <label>Email (opcional):</label><input id="editEmail" type="email" value="${produto.email || ''}"><br>
      <label>Jogo (opcional):</label><input id="editJogo" type="text" value="${produto.jogo || ''}"><br>
      <label>Defeito:</label><input id="editDefeito" type="text" value="${produto.defeito || ''}"><br>
      <label>Local de Conserto:</label><input id="editLocalConserto" type="number" value="${produto.localConserto || 0}"><br>
      <label>Custo de Manutenção:</label><input id="editCustoManutencao" type="number" step="0.01" value="${produto.custoManutencao || 0}"><br>
      <label>Agendamento (opcional):</label><input id="editAgendamento" type="text" value="${produto.agendamento || ''}"><br>
      <button id="confirmEditButton">Salvar</button>
      <button onclick="excluirProduto('${produto.id}', 'todos'); this.parentElement.parentElement.remove()">Excluir</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const confirmButton = modal.querySelector('#confirmEditButton');
  confirmButton.addEventListener('click', () => confirmarEditarSobre(produtoId));
}

function confirmarEditarSobre(produtoId) {
  if (!window.db || !window.firestoreFunctions) {
    console.error("Firebase não inicializado para edição.");
    alert("Erro: Firebase não inicializado.");
    return;
  }

  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  const nome = document.getElementById('editNome')?.value.trim();
  const identificador = document.getElementById('editIdentificador')?.value.trim();
  const quantidade = parseInt(document.getElementById('editQuantidade')?.value || 1);
  const categoria = document.getElementById('editCategoria')?.value.trim();
  const valor = parseFloat(document.getElementById('editValor')?.value || 0);
  const status = document.getElementById('editStatus')?.value;
  const email = document.getElementById('editEmail')?.value.trim() || '';
  const jogo = document.getElementById('editJogo')?.value.trim() || '';
  const defeito = document.getElementById('editDefeito')?.value.trim() || '';
  const localConserto = document.getElementById('editLocalConserto')?.value.trim() || '';
  const custoManutencao = parseFloat(document.getElementById('editCustoManutencao')?.value || 0);
  const agendamento = document.getElementById('editAgendamento')?.value.trim() || '';

  if (!nome || !identificador || quantidade < 1 || !categoria || valor < 0 || !status) {
    alert("Por favor, preencha todos os campos obrigatórios corretamente.");
    return;
  }

  produto.nome = nome;
  produto.identificador = identificador;
  produto.quantidade = quantidade;
  produto.categoria = categoria;
  produto.valor = valor;
  produto.status = status;
  produto.email = email;
  produto.jogo = jogo;
  produto.defeito = defeito;
  produto.localConserto = localConserto;
  produto.custoManutencao = custoManutencao;
  produto.agendamento = agendamento;

  console.log("Atualizando item no Firebase:", produto);
  setDoc(doc(window.db, "produtos", produto.id), produto).then(() => {
    console.log("Item atualizado com sucesso no Firebase:", produto.id);
    document.querySelector('.modal')?.remove();
    const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
    atualizarDashboard(filtroCategoria);
    const secaoAtiva = document.querySelector("main > section[style*='block']")?.id.replace('secao-', '');
    if (secaoAtiva === 'painel') {
      listarProdutosPainel(filtroCategoria);
    } else if (['backup', 'operacao', 'necessario', 'todos'].includes(secaoAtiva)) {
      listarProdutos(secaoAtiva);
    } else if (secaoAtiva === 'manutencao') {
      carregarManutencao();
    } else if (secaoAtiva === 'categoria-detalhes') {
      const nomeCategoria = document.querySelector('#secao-categoria-detalhes h3')?.textContent.replace('Detalhes do Andar: ', '');
      const categoriaId = categorias.find(c => c.nome === nomeCategoria)?.id || '';
      filtrarPorCategoria(nomeCategoria, categoriaId);
    }
  }).catch((error) => {
    console.error("Erro ao editar item:", error);
    alert("Falha ao editar item no Firebase: " + error.message);
  });
}

function mostrarModalEnviarItem(produtoId, filtroStatus) {
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    console.error("Item não encontrado para ID:", produtoId);
    alert("Erro: Item não encontrado.");
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Enviar Item: ${produto.nome}</h3>
      <button id="enviarOperacao" onclick="mostrarModalTransferencia('${produto.id}', 'operacao')">Operação</button>
      <button id="enviarBackup" onclick="mostrarModalTransferencia('${produto.id}', 'backup')">Backup</button>
      <button id="enviarManutencao" onclick="mostrarModalTransferencia('${produto.id}', 'manutencao')">Manutenção</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
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
window.voltar = voltar;
window.confirmarEditarProduto = confirmarEditarProduto;
window.mostrarModalEnviarItem = mostrarModalEnviarItem;