
const SUPABASE_URL = "https://ichrjyhnasudirvvozik.supabase.co";
const SUPABASE_KEY = "sb_publishable_QZ9RWB_m13jUwF6F5l-T1w_HqgMg3Ch";

if (!window.supabase) {
    throw new Error("A biblioteca do Supabase não foi carregada.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

document.addEventListener("DOMContentLoaded", iniciarStudyFlow);

function iniciarStudyFlow() {
    const $ = (id) => document.getElementById(id);

    const tela = $("telaAutenticacao");
    const painel = $("painelPrincipal");
    const mensagem = $("mensagem");

    let usuarioAtual = null;
    let materias = [];
    let notas = [];
    let materiaSelecionada = null;
    let carregandoDados = false;

    function mostrarMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("mensagem-erro", erro);
        mensagem.classList.add("mensagem-visivel");

        setTimeout(() => {
            mensagem.classList.remove("mensagem-visivel");
        }, 4000);
    }

    function alternarTela(logado) {
        tela.classList.toggle("oculto", logado);
        painel.classList.toggle("oculto", !logado);
    }

    function mostrarLogin() {
        $("formLogin").classList.remove("oculto");
        $("formCadastro").classList.add("oculto");
        $("abaLogin").classList.add("ativa");
        $("abaCadastro").classList.remove("ativa");
        $("tituloAutenticacao").textContent = "Bem-vindo de volta!";
        $("descricaoAutenticacao").textContent =
            "Entre na sua conta e volte pra escola.";
    }

    function mostrarCadastro() {
        $("formCadastro").classList.remove("oculto");
        $("formLogin").classList.add("oculto");
        $("abaCadastro").classList.add("ativa");
        $("abaLogin").classList.remove("ativa");
        $("tituloAutenticacao").textContent = "Crie sua conta!";
        $("descricaoAutenticacao").textContent =
            "Seu lugar de estudos começa aqui.";
    }

    $("abaLogin").addEventListener("click", mostrarLogin);
    $("abaCadastro").addEventListener("click", mostrarCadastro);

    async function executarComBotao(botao, texto, acao) {
        botao.disabled = true;
        botao.textContent = "Aguarde...";

        try {
            await acao();
        } catch (erro) {
            console.error(erro);
            mostrarMensagem(erro.message || "Ocorreu um erro.", true);
        } finally {
            botao.disabled = false;
            botao.textContent = texto;
        }
    }

    $("formCadastro").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nome = $("nomeCadastro").value.trim();
        const email = $("emailCadastro").value.trim();
        const senha = $("senhaCadastro").value;
        const botao = $("botaoCadastro");

        await executarComBotao(botao, "Criar minha conta", async () => {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password: senha,
                options: { data: { nome } }
            });

            if (error) throw error;

            if (data.session && data.user) {
                mostrarMensagem("Conta criada com sucesso!");
                await abrirPainel(data.user);
            } else {
                mostrarMensagem(
                    "Cadastro realizado! Confira seu e-mail para confirmar a conta."
                );
                mostrarLogin();
            }
        });
    });

    $("formLogin").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const email = $("emailLogin").value.trim();
        const senha = $("senhaLogin").value;
        const botao = $("botaoLogin");

        await executarComBotao(
            botao,
            "Entrar na minha conta",
            async () => {
                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
                        email,
                        password: senha
                    });

                if (error) throw error;

                await abrirPainel(data.user);
                mostrarMensagem("Login realizado! Bem-vindo ao StudyFlow.");
            }
        );
    });

    async function abrirPainel(usuario) {
        usuarioAtual = usuario;
        alternarTela(true);

        $("nomeUsuario").textContent =
            usuario.user_metadata?.nome ||
            usuario.email?.split("@")[0] ||
            "estudante";

        await carregarDados();
    }

    $("botaoSair").addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            mostrarMensagem("Erro ao sair: " + error.message, true);
            return;
        }

        limparDados();
        alternarTela(false);
        mostrarLogin();
        mostrarMensagem("Você saiu da sua conta.");
    });

    function limparDados() {
        usuarioAtual = null;
        materias = [];
        notas = [];
        materiaSelecionada = null;

        $("listaMaterias").innerHTML = "";
        $("listaNotas").innerHTML = "";
        $("nomeNota").innerHTML =
            '<option value="">Selecione uma matéria</option>';

        $("totalMaterias").textContent = "0";
        $("totalNotas").textContent = "0";
        $("mediaGeral").textContent = "—";

        $("estadoMaterias").classList.remove("oculto");
        $("estadoNotas").classList.remove("oculto");
    }

    async function carregarDados() {
        if (!usuarioAtual || carregandoDados) return;

        carregandoDados = true;

        try {
            const { data: materiasData, error: erroMaterias } =
                await supabaseClient
                    .from("materias")
                    .select("*")
                    .eq("user_id", usuarioAtual.id)
                    .order("created_at", { ascending: true });

            if (erroMaterias) throw erroMaterias;

            const { data: notasData, error: erroNotas } =
                await supabaseClient
                    .from("notas")
                    .select("*, materias(nome)")
                    .eq("user_id", usuarioAtual.id)
                    .order("created_at", { ascending: false });

            if (erroNotas) throw erroNotas;

            materias = materiasData || [];
            notas = notasData || [];

            atualizarTela();
        } catch (erro) {
            console.error("Erro ao carregar dados:", erro);
            mostrarMensagem(
                "Erro ao carregar matérias e notas: " + erro.message,
                true
            );
        } finally {
            carregandoDados = false;
        }
    }

    function atualizarTela() {
        const listaMaterias = $("listaMaterias");
        const listaNotas = $("listaNotas");
        const seletor = $("nomeNota");

        listaMaterias.innerHTML = "";
        listaNotas.innerHTML = "";

        $("estadoMaterias").classList.toggle(
            "oculto",
            materias.length > 0
        );

        materias.forEach((materia) => {
            const item = document.createElement("li");
            item.className = "item-lista";

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "botao-selecao";
            botao.textContent =
                (materiaSelecionada === materia.id ? "✓ " : "📘 ") +
                materia.nome;

            botao.classList.toggle(
                "selecionado",
                materiaSelecionada === materia.id
            );

            botao.addEventListener("click", () => {
                materiaSelecionada =
                    materiaSelecionada === materia.id
                        ? null
                        : materia.id;

                atualizarTela();
            });

            item.appendChild(botao);
            listaMaterias.appendChild(item);
        });

        seletor.innerHTML =
            '<option value="">Selecione uma matéria</option>';

        materias.forEach((materia) => {
            const opcao = document.createElement("option");
            opcao.value = materia.id;
            opcao.textContent = materia.nome;
            seletor.appendChild(opcao);
        });

        $("estadoNotas").classList.toggle("oculto", notas.length > 0);

        notas.forEach((nota) => {
            const item = document.createElement("li");
            item.className = "item-lista";

            const texto = document.createElement("span");
            texto.textContent =
                `${nota.materias?.nome || "Matéria"} — ` +
                Number(nota.valor).toFixed(1);

            const valor = Number(nota.valor);

            texto.classList.add(
                valor < 5
                    ? "nota-vermelha"
                    : valor < 7
                        ? "nota-amarela"
                        : "nota-verde"
            );

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "botao-excluir-nota";
            botao.textContent = "Excluir";
            botao.addEventListener("click", () => excluirNota(nota.id));

            item.append(texto, botao);
            listaNotas.appendChild(item);
        });

        $("totalMaterias").textContent = materias.length;
        $("totalNotas").textContent = notas.length;

        $("mediaGeral").textContent = notas.length
            ? (
                notas.reduce(
                    (soma, nota) => soma + Number(nota.valor),
                    0
                ) / notas.length
            ).toFixed(1)
            : "—";
    }

    $("formMateria").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!usuarioAtual) return;

        const campo = $("nomeMateria");
        const nome = campo.value.trim();

        if (!nome) return;

        const botao = $("botaoAdicionar");

        await executarComBotao(botao, "+ Adicionar", async () => {
            const { error } = await supabaseClient
                .from("materias")
                .insert({
                    nome,
                    user_id: usuarioAtual.id
                });

            if (error) throw error;

            campo.value = "";
            await carregarDados();
            mostrarMensagem("Matéria adicionada! 📚");
        });
    });

    $("botaoExcluir").addEventListener("click", async () => {
        if (!usuarioAtual) return;

        if (!materiaSelecionada) {
            mostrarMensagem("Selecione uma matéria para excluir.", true);
            return;
        }

        const id = materiaSelecionada;

        try {
            const { error } = await supabaseClient
                .from("materias")
                .delete()
                .eq("id", id)
                .eq("user_id", usuarioAtual.id);

            if (error) throw error;

            materiaSelecionada = null;
            await carregarDados();
            mostrarMensagem("Matéria excluída.");
        } catch (erro) {
            mostrarMensagem("Erro ao excluir matéria: " + erro.message, true);
        }
    });

    $("formNota").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!usuarioAtual) return;

        const materiaId = $("nomeNota").value;
        const valor = Number($("valorNota").value);

        if (
            !materiaId ||
            !Number.isFinite(valor) ||
            valor < 0 ||
            valor > 10
        ) {
            mostrarMensagem(
                "Selecione uma matéria e informe uma nota de 0 a 10.",
                true
            );
            return;
        }

        const botao = $("botaoSalvarNota");

        await executarComBotao(botao, "Salvar nota", async () => {
            const { error } = await supabaseClient
                .from("notas")
                .insert({
                    materia_id: materiaId,
                    valor,
                    user_id: usuarioAtual.id
                });

            if (error) throw error;

            $("valorNota").value = "";
            await carregarDados();
            mostrarMensagem("Nota salva com sucesso!");
        });
    });

    async function excluirNota(id) {
        if (!usuarioAtual) return;

        try {
            const { error } = await supabaseClient
                .from("notas")
                .delete()
                .eq("id", id)
                .eq("user_id", usuarioAtual.id);

            if (error) throw error;

            await carregarDados();
            mostrarMensagem("Nota excluída.");
        } catch (erro) {
            mostrarMensagem("Erro ao excluir nota: " + erro.message, true);
        }
    }

    document.querySelectorAll("[data-destino]").forEach((botao) => {
        botao.addEventListener("click", (evento) => {
            evento.preventDefault();

            const destino = botao.dataset.destino;

            const secoes = {
                inicio: $("inicio"),
                materias: $("secaoMaterias"),
                notas: $("areaNotas")
            };

            secoes[destino]?.scrollIntoView({
                behavior: "smooth",
                block: destino === "inicio" ? "start" : "start"
            });

            document.querySelectorAll(".menu-item").forEach((item) => {
                item.classList.toggle(
                    "ativo",
                    item.dataset.destino === destino
                );
            });
        });
    });

    async function iniciar() {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            alternarTela(false);
            mostrarMensagem("Erro ao verificar sessão: " + error.message, true);
            return;
        }

        if (data.session?.user) {
            await abrirPainel(data.session.user);
        } else {
            limparDados();
            alternarTela(false);
            mostrarLogin();
        }
    }

    supabaseClient.auth.onAuthStateChange((evento) => {
        if (evento === "SIGNED_OUT") {
            limparDados();
            alternarTela(false);
            mostrarLogin();
        }
    });

    iniciar();
}
