<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INVENT</title>
  <link rel="stylesheet" href="style.css">
  <script type="module">
    // Importa os módulos do Firebase
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
    import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  deleteDoc
} 
from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';


window.firestoreFunctions = {
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  deleteDoc
};


    // Configuração do Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyBowmtuLTQvmT9hxMIegrACBOcfQsZ53Ow",
      authDomain: "inventario-exceed.firebaseapp.com",
      projectId: "inventario-exceed",
      storageBucket: "inventario-exceed.firebasestorage.app",
      messagingSenderId: "391201279361",
      appId: "1:391201279361:web:bfbb6ee1e19ef780372c80",
      measurementId: "G-DVEB6FGELT"
    };

    try {
      // Inicializa o Firebase
      const app = initializeApp(firebaseConfig);
      console.log("Firebase inicializado com sucesso:", app);
      const db = getFirestore(app);
      window.db = db; // Expõe db globalmente para script.js
      window.firestoreFunctions = { collection, getDocs }; // Exporta funções úteis
      console.log("Firestore inicializado:", db); // Log para depuração
    } catch (error) {
      console.error("Erro ao inicializar o Firebase:", error);
      alert("Falha ao inicializar o Firebase. Verifique a console para mais detalhes: " + error.message);
    }

    // Importa o script principal
    import './script.js';
  </script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="container">
    <nav class="sidebar">
      <h1>INVENT</h1>
      <ul>
        <li class="nav-item active" data-secao="painel"><i class="fas fa-chart-line"></i>PAINEL</li>
        <li class="nav-item" data-secao="backup"><i class="fas fa-box"></i>BACKUP</li>
        <li class="nav-item" data-secao="operacao"><i class="fas fa-rocket"></i>OPERAÇÃO</li>
        <li class="nav-item" data-secao="necessario"><i class="fas fa-wrench"></i>NECESSÁRIO OPS</li>
        <li class="nav-item" data-secao="manutencao"><i class="fas fa-tools"></i>MANUTENÇÃO</li>
        <li class="nav-item" data-secao="todos"><i class="fas fa-list"></i>TODOS</li>
        <li id="toggleDark" style="cursor: pointer;"><i>🌙</i> Mudar para Modo Escuro</li>
      </ul>
    </aside>

    <main class="main">
      <section id="secao-painel" style="display: block;">
        <div class="profile">
          <img src="https://via.placeholder.com/90" class="avatar" alt="Avatar">
          <h2>T.I</h2>
          <p>Proprietário</p>
          <div class="stats">
            <div><strong>0</strong><br>Total Backup</div>
            <div><strong>0</strong><br>Produtos</div>
          </div>
        </div>

        <div class="cards">
          <div id="cardReceita" class="card income">
            <h3>Receita</h3>
            <p>R$ 0.00</p>
          </div>
          <div id="cardManutencao" class="card visits">
            <h3>Lista (Reparo)</h3>
            <p>0</p>
          </div>
          <div id="cardBackup" class="card sales">
            <h3>Unidades (Backup)</h3>
            <p>0</p>
          </div>
          <div id="cardOperacao" class="card sales">
            <h3>Unidades (Operação)</h3>
            <p>0</p>
          </div>
        </div>

        <div class="chart">
          <h3>Visão Geral</h3>
          <canvas id="grafico"></canvas>
        </div>
      </section>

      <section id="secao-backup" style="display: none;">
        <div class="table-section">
          <h3>Produtos em Backup</h3>
          <table id="tabelaBackup">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="secao-operacao" style="display: none;">
        <div class="table-section">
          <h3>Produtos em Operação</h3>
          <table id="tabelaOperacao">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="secao-necessario" style="display: none;">
        <div class="table-section">
          <h3>Produtos em Manutenção</h3>
          <table id="tabelaNecessario">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="secao-manutencao" style="display: none;">
        <div class="table-section">
          <h3>Produtos em Manutenção</h3>
          <table id="tabelaManutencao">
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
            <tbody></tbody>
          </table>
        </div>
      </section>

      <section id="secao-todos" style="display: none;">
        <div class="table-section">
          <h3>Todos os Produtos</h3>
          <table id="tabelaProdutos">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="script.js"></script>
</body>
</html>