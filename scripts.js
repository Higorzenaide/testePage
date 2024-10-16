document.getElementById("csvFile").addEventListener("change", handleFileSelect);
        document.getElementById("removeFile").addEventListener("click", removeFile);
        document.getElementById("downloadAll").addEventListener("click", downloadAllData);

        let currentData = [];
        let currentPage = 1;
        const recordsPerPage = 500; // Número de registros por página

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            const loadingIndicator = document.getElementById("loadingIndicator");
            const table = document.getElementById("csvTable");
            table.innerHTML = '';  // Limpa a tabela anterior

            loadingIndicator.style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;

                Papa.parse(text, {
                    header: true,
                    encoding: "ISO-8859-1",
                    worker: true,
                    complete: function(results) {
                        loadingIndicator.style.display = 'none';
                        currentData = processCsvData(results.data);
                        displayTable(currentData);
                    },
                    error: function(err) {
                        console.error("Erro ao processar o arquivo", err);
                        loadingIndicator.style.display = 'none';
                    }
                });
            };

            reader.readAsText(file, "ISO-8859-1");
        }

        function removeFile() {
            document.getElementById("csvFile").value = ''; // Limpa o campo de upload
            currentData = []; // Reseta os dados
            document.getElementById("removeFile"); // Esconde o botão de remover
            document.getElementById("csvTable").innerHTML = ''; // Limpa a tabela
            document.getElementById("recordCount").innerText = ''; // Limpa a contagem de registros
            document.getElementById("pagination").innerHTML = ''; // Limpa a paginação
        }

        function processCsvData(data) {
            const now = new Date(); // Data atual
            const processedData = [];

            data.forEach(row => {
                const agendamento = row["Data do Primeiro Agendamento"];
                const tipoTrabalho = row["Tipo de Trabalho"];
                const numeroCompromisso = row["Número de compromisso"];
                const cidade = row["Cidade"];
                const regional = row["Regional"];

                // Ignora linhas vazias
                if (!agendamento || !tipoTrabalho || !numeroCompromisso || !cidade || !regional) {
                    return; // Pula esta linha se qualquer um dos dados obrigatórios estiver ausente
                }

                // Ignora "Retirada de Equipamento"
                if (tipoTrabalho === "Retirada de Equipamento") {
                    return; // Pula esta linha se o tipo de trabalho for "Retirada de Equipamento"
                }

                // Extraindo a data e hora do agendamento
                const [dataAgendamento, horaAgendamento] = agendamento.split(" ");
                const [dia, mes, ano] = dataAgendamento.split("/").map(Number);
                const [hora, minuto] = horaAgendamento.split(":").map(Number);

                // Determinando o prazo de vencimento com base no tipo de trabalho
                let prazoVencimento = 0;
                if (tipoTrabalho === "Manutenção") {
                    prazoVencimento = 24; // 24 horas
                } else if (tipoTrabalho === "Mudança de endereço" || tipoTrabalho === "Ativação") {
                    prazoVencimento = 72; // 72 horas
                } else {
                    return; // Se o tipo de trabalho não for relevante, ignora
                }

                // Calculando a data de vencimento
                const dataVencimento = new Date(ano, mes - 1, dia, hora + prazoVencimento, minuto);
                // Verificando se já venceu
                let tempoRestante;
                const diff = dataVencimento - now; // diferença em milissegundos

                if (diff < 0) {
                    tempoRestante = "Já venceu";
                } else {
                    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    tempoRestante = `${dias} dias, ${horas} horas e ${minutos} minutos`;
                }

                // Formatando a data de vencimento para português
                const dataVencimentoFormatada = dataVencimento.toLocaleString('pt-BR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                processedData.push({
                    cidade,
                    regional,
                    agendamento,
                    tipoTrabalho,
                    numeroCompromisso,
                    tempoRestante,
                    dataVencimento: dataVencimentoFormatada, // Usando a data formatada
                    vencimentoTimestamp: dataVencimento.getTime(), // Adicionando o timestamp para ordenação
                    isVencido: diff < 0 // Adicionando um indicador para saber se já venceu
                });
            });

            // Ordena os dados pelo tempo restante, colocando os não vencidos primeiro
            processedData.sort((a, b) => {
                if (a.isVencido && !b.isVencido) return 1; // b primeiro
                if (!a.isVencido && b.isVencido) return -1; // a primeiro
                return a.vencimentoTimestamp - b.vencimentoTimestamp; // Ordena pelo timestamp
            });

            return processedData;
        }

        function displayTable(data) {
            const table = document.getElementById("csvTable");
            table.innerHTML = ''; // Limpa a tabela anterior

            // Cabeçalho da tabela
            const headerRow = document.createElement("tr");
            headerRow.innerHTML = `
                <th>Cidade</th>
                <th>Regional</th>
                <th>Data do Primeiro Agendamento</th>
                <th>Tipo de Trabalho</th>
                <th>Número de Compromisso</th>
                <th>Tempo até Vencer</th>
                <th>Data de Vencimento arredondado</th>
            `;
            table.appendChild(headerRow);

            // Paginação
            const totalPages = Math.ceil(data.length / recordsPerPage);
            const startIndex = (currentPage - 1) * recordsPerPage;
            const endIndex = Math.min(startIndex + recordsPerPage, data.length);
            const paginatedData = data.slice(startIndex, endIndex);

            // Adiciona as linhas de dados
            paginatedData.forEach(row => {
                const tableRow = document.createElement("tr");
                tableRow.innerHTML = `
                    <td>${row.cidade}</td>
                    <td>${row.regional}</td>
                    <td>${row.agendamento}</td>
                    <td>${row.tipoTrabalho}</td>
                    <td>${row.numeroCompromisso}</td>
                    <td>${row.tempoRestante}</td>
                    <td>${row.dataVencimento}</td>
                `;
                table.appendChild(tableRow);
            });

            // Exibe contagem de registros
            const recordCount = document.getElementById("recordCount");
            recordCount.innerText = `Exibindo ${startIndex + 1} a ${endIndex} de ${data.length} registros`;

            // Exibe a paginação
            const pagination = document.getElementById("pagination");
            pagination.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const pageButton = document.createElement("button");
                pageButton.innerText = i;
                pageButton.onclick = function() {
                    currentPage = i; // Atualiza a página atual
                    displayTable(data); // Re-renderiza a tabela
                };
                pagination.appendChild(pageButton);
            }
        }
        function downloadAllData() {
            const csv = Papa.unparse(currentData);
            
            // Adicionando um BOM para UTF-8 no início do CSV
            const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'VencimentoSF.csv');
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Filtros
        document.getElementById("filterCidade").addEventListener("input", applyFilters);
        document.getElementById("filterRegional").addEventListener("input", applyFilters);
        document.getElementById("filterAgendamento").addEventListener("input", applyFilters);
        document.getElementById("filterTipoTrabalho").addEventListener("input", applyFilters);
        document.getElementById("filterNumero").addEventListener("input", applyFilters);
        document.getElementById("filterTempo").addEventListener("input", applyFilters);

        function applyFilters() {
            const cidadeFilter = document.getElementById("filterCidade").value.toLowerCase();
            const regionalFilter = document.getElementById("filterRegional").value.toLowerCase();
            const agendamentoFilter = document.getElementById("filterAgendamento").value.toLowerCase();
            const tipoTrabalhoFilter = document.getElementById("filterTipoTrabalho").value.toLowerCase();
            const numeroFilter = document.getElementById("filterNumero").value.toLowerCase();
            const tempoFilter = document.getElementById("filterTempo").value.toLowerCase();

            const filteredData = currentData.filter(row => {
                return (
                    row.cidade.toLowerCase().includes(cidadeFilter) &&
                    row.regional.toLowerCase().includes(regionalFilter) &&
                    row.agendamento.toLowerCase().includes(agendamentoFilter) &&
                    row.tipoTrabalho.toLowerCase().includes(tipoTrabalhoFilter) &&
                    row.numeroCompromisso.toLowerCase().includes(numeroFilter) &&
                    row.tempoRestante.toLowerCase().includes(tempoFilter)
                );
            });

            currentPage = 1; // Reinicia a página para mostrar os primeiros resultados
            displayTable(filteredData); // Exibe os dados filtrados
        }

        // Função para rolar para a direita
    function scrollRight() {
        const container = document.querySelector('.scroll-container');
        container.scrollBy({
            top: 0,
            left: 100, // Altere o valor para ajustar a quantidade que rola
            behavior: 'smooth' // Rolagem suave
        });
    }

    // Função para rolar para a esquerda
    function scrollLeft() {
        const container = document.querySelector('.scroll-container');
        container.scrollBy({
            top: 0,
            left: -100, // Altere o valor para ajustar a quantidade que rola
            behavior: 'smooth' // Rolagem suave
        });
    }