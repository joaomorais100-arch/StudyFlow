document.addEventListener("DOMContentLoaded", function () {
    const campoMateria = document.getElementById("nomeMateria");
    const formMateria = document.getElementById("formMateria");
    const listaMaterias = document.getElementById("listaMaterias");
    const estadoMaterias = document.getElementById("estadoMaterias");
    const botaoExcluir = document.getElementById("botaoExcluir");

    const areaNotas = document.getElementById("areaNotas");
    const formNota = document.getElementById("formNota");
    const campoNomeNota = document.getElementById("nomeNota");
    const campoValorNota = document.getElementById("valorNota");
    const listaNotas = document.getElementById("listaNotas");
    const estadoNotas = document.getElementById("estadoNotas");
    const resumoNotas = document.getElementById("resumoNotas");

    const totalMaterias = document.getElementById("totalMaterias");
    const totalNotas = document.getElementById("totalNotas");
    const mensagem = document.getElementById("mensagem");

    const CHAVE = "studyflow-dados-v2";

    let dados = carregarDados();
    let temporizadorMensagem;

    function carregarDados() {
        try {
            const salvos = JSON.parse(localStorage.getItem(CHAVE));

            if (
                salvos &&
                Array.isArray(salvos.materias) &&
                Array.isArray(salvos.notas)
            ) {
                return salvos;
            }
        } catch (erro) {
            console.warn("Não foi possível carregar os dados salvos.", erro);
        }

        return {
            materias: [],
            notas: [],
            selecionada: null
        };
    }

    function salvarDados() {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(dados));
            return true;
        } catch (erro) {
            mostrarMensagem("Não foi possível salvar os dados neste navegador.", true);
            return false;
        }
    }

    function criarId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 9);
    }

    function mostrarMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", erro);

        clearTimeout(temporizadorMensagem);

        temporizadorMensagem = setTimeout(function () {
            mensagem.textContent = "";
            mensagem.classList.remove("erro");
        }, 3500);
    }

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function renderizarMaterias() {
        listaMaterias.replaceChildren();
        campoNomeNota.replaceChildren();

        const opcaoInicial = criarElemento(
            "option",
            "",
            "Selecione uma matéria"
        );

        opcaoInicial.value = "";
        campoNomeNota.appendChild(opcaoInicial);

        dados.materias.forEach(function (materia) {
            const item = document.createElement("li");
            const radio = document.createElement("input");
            const label = document.createElement("label");
            const botaoRemover = document.createElement("button");

            radio.type = "radio";
            radio.name = "materiaSelecionada";
            radio.value = materia.id;
            radio.id = "materia-" + materia.id;
            radio.checked = dados.selecionada === materia.id;
            radio.setAttribute("aria-label", "Selecionar " + materia.nome);

            label.htmlFor = radio.id;
            label.textContent = materia.nome;

            radio.addEventListener("change", function () {
                dados.selecionada = materia.id;
                salvarDados();
            });

            botaoRemover.type = "button";
            botaoRemover.textContent = "Excluir";
            botaoRemover.setAttribute(
                "aria-label",
                "Excluir matéria " + materia.nome
            );

            botaoRemover.addEventListener("click", function () {
                excluirMateria(materia.id);
            });

            item.append(radio, label, botaoRemover);
            listaMaterias.appendChild(item);

            const opcao = criarElemento("option", "", materia.nome);
            opcao.value = materia.id;
            campoNomeNota.appendChild(opcao);
        });

        estadoMaterias.hidden = dados.materias.length > 0;

        totalMaterias.textContent =
            dados.materias.length +
            (dados.materias.length === 1 ? " matéria" : " matérias");

        botaoExcluir.disabled = dados.selecionada === null ||
            !dados.materias.some(function (materia) {
                return materia.id === dados.selecionada;
            });
    }

    function excluirMateria(id) {
        const materia = dados.materias.find(function (item) {
            return item.id === id;
        });

        if (!materia) return;

        const temNotas = dados.notas.some(function (nota) {
            return nota.materiaId === id;
        });

        const aviso = temNotas
            ? "Excluir \"" + materia.nome +
              "\" também apagará as notas dela. Deseja continuar?"
            : "Deseja excluir a matéria \"" + materia.nome + "\"?";

        if (!confirm(aviso)) return;

        dados.materias = dados.materias.filter(function (item) {
            return item.id !== id;
        });

        dados.notas = dados.notas.filter(function (nota) {
            return nota.materiaId !== id;
        });

        if (dados.selecionada === id) {
            dados.selecionada = null;
        }

        if (salvarDados()) {
            renderizarTudo();
            mostrarMensagem("Matéria excluída com sucesso.");
        }
    }

    formMateria.addEventListener("submit", function (evento) {
        evento.preventDefault();

        const nome = campoMateria.value.trim();

        if (!nome) {
            mostrarMensagem("Digite o nome da matéria.", true);
            campoMateria.focus();
            return;
        }

        const jaExiste = dados.materias.some(function (materia) {
            return materia.nome.toLocaleLowerCase("pt-BR") ===
                nome.toLocaleLowerCase("pt-BR");
        });

        if (jaExiste) {
            mostrarMensagem("Essa matéria já foi adicionada.", true);
            campoMateria.focus();
            return;
        }

        const materia = {
            id: criarId(),
            nome: nome
        };

        dados.materias.push(materia);
        dados.selecionada = materia.id;

        if (salvarDados()) {
            campoMateria.value = "";
            renderizarTudo();
            mostrarMensagem("Matéria adicionada com sucesso!");
        }
    });

    botaoExcluir.addEventListener("click", function () {
        if (!dados.selecionada) {
            mostrarMensagem("Selecione uma matéria para excluir.", true);
            return;
        }

        excluirMateria(dados.selecionada);
    });

    formNota.addEventListener("submit", function (evento) {
        evento.preventDefault();

        const materiaId = campoNomeNota.value;
        const valorTexto = campoValorNota.value;
        const valor = Number(valorTexto);

        if (!dados.materias.some(function (materia) {
            return materia.id === materiaId;
        })) {
            mostrarMensagem("Selecione uma matéria válida.", true);
            return;
        }

        if (
            valorTexto.trim() === "" ||
            !Number.isFinite(valor) ||
            valor < 0 ||
            valor > 10
        ) {
            mostrarMensagem("Digite uma nota entre 0 e 10.", true);
            campoValorNota.focus();
            return;
        }

        dados.notas.push({
            id: criarId(),
            materiaId: materiaId,
            valor: valor
        });

        if (salvarDados()) {
            campoValorNota.value = "";
            renderizarTudo();
            campoNomeNota.value = materiaId;
            mostrarMensagem("Nota salva com sucesso!");
        }
    });

    function renderizarNotas() {
        listaNotas.replaceChildren();

        dados.notas.forEach(function (nota) {
            const materia = dados.materias.find(function (item) {
                return item.id === nota.materiaId;
            });

            if (!materia) return;

            const item = document.createElement("li");
            const descricao = criarElemento(
                "span",
                "",
                materia.nome + " — Nota: "
            );

            let corNota = "";

if (nota.valor < 6) {
    corNota = "nota-vermelha";
} else if (nota.valor < 7) {
    corNota = "nota-amarela";
} else {
    corNota = "nota-verde";
}

const valor = criarElemento(
    "strong",
    corNota,
    nota.valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })
);
            const botaoRemover = criarElemento(
                "button",
                "",
                "Excluir"
            );

            botaoRemover.type = "button";
            botaoRemover.setAttribute("aria-label", "Excluir nota de " + materia.nome);

            botaoRemover.addEventListener("click", function () {
                if (!confirm("Deseja excluir esta nota?")) return;

                dados.notas = dados.notas.filter(function (itemNota) {
                    return itemNota.id !== nota.id;
                });

                if (salvarDados()) {
                    renderizarTudo();
                    mostrarMensagem("Nota excluída.");
                }
            });

            descricao.appendChild(valor);
            item.append(descricao, botaoRemover);
            listaNotas.appendChild(item);
        });

        estadoNotas.hidden = dados.notas.length > 0;

        totalNotas.textContent =
            dados.notas.length === 0
                ? "Nenhuma nota"
                : dados.notas.length +
                  (dados.notas.length === 1 ? " nota registrada" : " notas registradas");

        if (dados.notas.length === 0) {
            resumoNotas.textContent = "Você ainda não registrou nenhuma nota.";
            return;
        }

        const soma = dados.notas.reduce(function (total, nota) {
            return total + nota.valor;
        }, 0);

        const media = soma / dados.notas.length;

        resumoNotas.textContent =
            "Média geral das notas registradas: " +
            media.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2
            }) +
            " / 10 · " +
            dados.notas.length +
            (dados.notas.length === 1 ? " nota registrada" : " notas registradas");
    }

    function renderizarTudo() {
        renderizarMaterias();
        renderizarNotas();
    }

    function navegar(destino) {
        let alvo;

        if (destino === "inicio") {
            alvo = document.getElementById("inicio");
        } else if (destino === "materias") {
            alvo = document.getElementById("secaoMaterias");
        } else if (destino === "notas") {
            alvo = areaNotas;
        }

        if (!alvo) return;

        alvo.scrollIntoView({
            behavior: "smooth",
            block: destino === "inicio" ? "start" : "start"
        });

        document.querySelectorAll(".menu-item[data-destino]").forEach(function (botao) {
            const ativo = botao.dataset.destino === destino;
            botao.classList.toggle("ativo", ativo);

            if (ativo) {
                botao.setAttribute("aria-current", "page");
            } else {
                botao.removeAttribute("aria-current");
            }
        });
    }

    document.querySelectorAll("[data-destino]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            navegar(botao.dataset.destino);
        });
    });

    renderizarTudo();
});
