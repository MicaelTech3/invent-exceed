let produtos = [];

// Dados simulados para o gráfico
const chartData = {
  labels: ["10 Mar", "11 Mar", "12 Mar", "13 Mar", "14 Mar", "15 Mar", "16 Mar"],
  datasets: [{
    label: 'Vendas',
    data: [500, 700, 400, 650, 900, 1200, 1500],
    borderColor: '#1e90ff',
    backgroundColor: 'rgba(30,144,255,0.2)',
    tension: 0.3,
    fill: true
  }]
};

window.onload = () => {
  const canvas = document.getElementById('grafico');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  aplicarModoEscuro();
  document.getElementById('toggleDark').addEventListener('click', alternarModoEscuro);
  document.getElementById('cardReceita').addEventListener('click', mostrarDetalhesReceita);

  // Adiciona eventos para os itens do sidebar
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const secao = item.getAttribute('data-secao');
      mostrarSecao(secao);
    });
  });

  // Carrega produtos do Firestore ao iniciar
  if (typeof window.db !== 'undefined' && window.db && window.firestoreFunctions) carregarProdutosFirestore();
  mostrarSecao('painel');
};

function alternarModoEscuro() {
  const corpo = document.body;
  corpo.classList.toggle('modo-escuro');
  const isDarkMode = corpo.classList.contains('modo-escuro');
  localStorage.setItem('modoEscuro', isDarkMode);
  document.getElementById('toggleDark').innerHTML = isDarkMode 
    ? '<i>☀️</i> Mudar para Modo Claro' 
    : '<i>🌙</i> Mudar para Modo Escuro';
}

function aplicarModoEscuro() {
  const modoSalvo = localStorage.getItem('modoEscuro') === 'true';
  if (modoSalvo) {
    document.body.classList.add('modo-escuro');
    document.getElementById('toggleDark').innerHTML = '<i>☀️</i> Mudar para Modo Claro';
  } else {
    document.getElementById('toggleDark').innerHTML = '<i>🌙</i> Mudar para Modo Escuro';
  }
}

function mostrarSecao(secao) {
  const secoes = document.querySelectorAll("main > section");
  secoes.forEach(s => s.style.display = "none");

  const ativa = document.getElementById(`secao-${secao}`);
  if (ativa) ativa.style.display = "block";

  const itens = document.querySelectorAll(".nav-item");
  itens.forEach(i => i.classList.remove("active"));

  const nomes = ['painel', 'backup', 'operacao', 'necessario', 'manutencao', 'todos'];
  const index = nomes.indexOf(secao);
  if (index >= 0) itens[index].classList.add("active");

  if (['backup', 'operacao', 'necessario', 'todos'].includes(secao)) {
    const status = secao === 'operacao' ? 'operacao' : secao === 'necessario' ? 'manutencao' : secao === 'todos' ? 'todos' : 'backup';
    listarProdutos(status);
  }

  if (secao === 'painel') atualizarDashboard();
  if (secao === 'manutencao') carregarManutencao();
}

function mostrarModalCriarProduto(status) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Criar Novo Produto</h3>
      <label>Nome:</label><input id="nome" type="text" required><br>
      <label>Quantidade:</label><input id="quantidade" type="number" min="0" required><br>
      <label>Categoria:</label><input id="categoria" type="text" required><br>
      <label>Valor Unitário:</label><input id="valor" type="number" step="0.01" min="0" required><br>
      <button id="confirmButton">Confirmar</button>
      <button onclick="this.parentElement.parentElement.remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Adiciona o evento ao botão Confirmar
  const confirmButton = modal.querySelector('#confirmButton');
  confirmButton.addEventListener('click', () => confirmarCriarProduto(status));
}

function confirmarCriarProduto(status) {
  const nome = document.getElementById('nome').value;
  const quantidade = parseInt(document.getElementById('quantidade').value || 0);
  const categoria = document.getElementById('categoria').value;
  const valor = parseFloat(document.getElementById('valor').value || 0);
  
  console.log("Valores:", { nome, quantidade, categoria, valor, db: window.db });
  
  if (nome && quantidade >= 0 && categoria && valor >= 0 && typeof window.db !== 'undefined' && window.db && window.firestoreFunctions) {
    const novoProduto = {
      nome,
      quantidade,
      categoria,
      valor,
      status: status === 'todos' ? 'backup' : status,
      defeito: "",
      localConserto: "",
      custoManutencao: 0,
      agendamento: "",
      historicoTransferencias: []
    };
    adicionarProdutoFirestore(novoProduto);
    document.querySelector('.modal').remove();
    atualizarDashboard();
  } else {
    console.error("Validação falhou:", { nome, quantidade, categoria, valor, db: window.db });
    alert("Por favor, preencha todos os campos corretamente ou verifique a conexão com o Firebase.");
  }
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
  }).catch((error) => {
    console.error("Erro ao atualizar produto:", error);
    alert("Falha ao atualizar produto no Firebase.");
  });
}

function listarProdutos(filtroStatus) {
  const tabela = document.getElementById("tabelaProdutos");
  if (!tabela) return;

  tabela.innerHTML = "";
  const existingHeader = tabela.parentElement.querySelector('.table-header');
  if (existingHeader) existingHeader.remove();

  const container = document.createElement("div");
  container.className = "table-header";
  const botaoCriar = document.createElement("button");
  botaoCriar.textContent = "Criar Produto";
  botaoCriar.className = "criar-produto";
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
    const validOptions = produto.status === 'backup' ? ['manutencao', 'operacao'] :
                        produto.status === 'operacao' ? ['manutencao', 'backup'] :
                        ['operacao', 'backup'];
    tr.innerHTML = `
      <td ${filtroStatus === 'todos' ? `onclick="mostrarDetalhesProduto(${i})" style="cursor: pointer;"` : ''}>${produto.nome}</td>
      <td>${produto.quantidade}</td>
      <td>${produto.categoria}</td>
      <td>R$ ${produto.valor.toFixed(2)}</td>
      <td>${produto.status}</td>
      <td>
        ${validOptions.map(opt => `
          <button onclick="mostrarModalTransferencia(${i}, '${opt}', '${filtroStatus}')">${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : '📦 Backup'}</button>
        `).join('')}
        <button onclick="excluirProduto(${i}, '${filtroStatus}')">🗑️</button>
      </td>
    `;
    tabela.appendChild(tr);
  });
}

function filtrarProdutos(filtroStatus) {
  const searchTerm = document.querySelector('.search-bar')?.value.toLowerCase() || '';
  return produtos.filter(p => 
    p.status === filtroStatus || filtroStatus === 'todos' &&
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

  // Adiciona o evento ao botão Confirmar
  const confirmButton = modal.querySelector('#confirmTransferButton');
  confirmButton.addEventListener('click', () => confirmarTransferencia(i, novoStatus, filtroStatus));
}

function confirmarTransferencia(i, novoStatus, filtroStatus) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  let detalhes = {};
  if (novoStatus === 'manutencao') {
    detalhes.defeito = document.getElementById('defeito').value || "";
    detalhes.localConserto = document.getElementById('localConserto').value || "";
    detalhes.custoManutencao = parseFloat(document.getElementById('custoManutencao').value || 0);
    detalhes.agendamento = document.getElementById('agendamento').value || "";
  } else {
    detalhes.motivo = document.getElementById('motivo').value || "";
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
    document.querySelector('.modal').remove();
    atualizarDashboard();
    if (novoStatus !== 'manutencao' && filtroStatus === 'manutencao') {
      mostrarSecao(novoStatus);
    } else if (filtroStatus !== 'todos') {
      carregarManutencao();
    } else {
      listarProdutos(filtroStatus);
    }
  }).catch((error) => {
    console.error("Erro ao transferir produto:", error);
    alert("Falha ao transferir produto no Firebase.");
  });
}

function mostrarDetalhesProduto(i) {
  const secao = document.getElementById("secao-todos");
  if (secao) {
    secao.innerHTML = `
      <div class="table-section">
        <button class="back-button" onclick="listarProdutos('todos')">⬅️ Voltar</button>
        <h3>Detalhes do Produto: ${produtos[i].nome}</h3>
        <div class="product-details">
          <p><strong>Nome:</strong> ${produtos[i].nome}</p>
          <p><strong>Quantidade:</strong> ${produtos[i].quantidade}</p>
          <p><strong>Categoria:</strong> ${produtos[i].categoria}</p>
          <p><strong>Valor Unitário:</strong> R$ ${produtos[i].valor.toFixed(2)}</p>
          <p><strong>Status:</strong> ${produtos[i].status}</p>
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
            ${['backup', 'operacao', 'manutencao'].filter(s => s !== produtos[i].status).map(opt => `
              <button onclick="mostrarModalTransferencia(${i}, '${opt}', 'todos')">${opt === 'manutencao' ? '🔧 Manutenção' : opt === 'operacao' ? '🚀 Operação' : '📦 Backup'}</button>
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
      if (filtroStatus !== 'todos') carregarManutencao();
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

  document.querySelector('.stats div:nth-child(1) strong').textContent = totalBackup.toLocaleString();
  document.querySelector('.stats div:nth-child(2) strong').textContent = totalProdutos.toLocaleString();
  document.querySelector('#cardReceita p').textContent = `R$ ${produtos.reduce((sum, p) => sum + p.quantidade * p.valor, 0).toFixed(2)}`;
  document.querySelector('#cardBackup p').textContent = totalBackup.toLocaleString();
  document.querySelector('#cardOperacao p').textContent = totalOperacao.toLocaleString();
}

function carregarManutencao() {
  const secao = document.getElementById("secao-manutencao");
  if (secao) {
    secao.innerHTML = `
      <div class="table-section">
        <h3>Produtos em Manutenção</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Defeito</th>
              <th>Local de Conserto</th>
              <th>Custo</th>
              <th>Agendamento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${produtos
              .filter(p => p.status === 'manutencao')
              .map(p => `
                <tr>
                  <td>${p.nome}</td>
                  <td>${p.defeito}</td>
                  <td>
                    <input type="text" value="${p.localConserto || ''}" onchange="atualizarLocalConserto('${p.id}', this.value)">
                  </td>
                  <td>R$ ${p.custoManutencao.toFixed(2)}</td>
                  <td>${p.agendamento || 'N/A'}</td>
                  <td>
                    <button onclick="mostrarModalTransferencia(${produtos.findIndex(pr => pr.id === p.id)}, 'operacao', 'manutencao')">🚀 Operação</button>
                    <button onclick="mostrarModalTransferencia(${produtos.findIndex(pr => pr.id === p.id)}, 'backup', 'manutencao')">📦 Backup</button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function atualizarLocalConserto(id, novoValor) {
  if (!window.db || !window.firestoreFunctions) return;
  const { doc, setDoc } = window.firestoreFunctions;
  const produto = produtos.find(p => p.id === id);
  if (produto) {
    produto.localConserto = novoValor;
    setDoc(doc(window.db, "produtos", produto.id), produto).catch((error) => {
      console.error("Erro ao atualizar local de conserto:", error);
    });
  }
}

function atualizarListas() {
  const secaoAtiva = document.querySelector("main > section[style*='block']")?.id.replace('secao-', '');
  if (secaoAtiva === 'manutencao') carregarManutencao();
  else if (['backup', 'operacao', 'necessario', 'todos'].includes(secaoAtiva)) listarProdutos(secaoAtiva);
}

window.confirmarCriarProduto = confirmarCriarProduto;
window.mostrarModalCriarProduto = mostrarModalCriarProduto;
window.excluirProduto = excluirProduto;
window.listarProdutos = listarProdutos;
window.mostrarDetalhesProduto = mostrarDetalhesProduto;
window.mostrarModalTransferencia = mostrarModalTransferencia;
