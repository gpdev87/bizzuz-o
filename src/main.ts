import { URL_DADOS } from './config';
import {
  armazenamentoIndexedDB,
  baixarBase,
  iniciarDados,
  verificarAtualizacao,
  type OpcoesDados,
} from './dados/repositorio';
import { montarApp, type App } from './ui/app';
import './ui/estilo.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

/** Intervalo mínimo entre verificações disparadas por retomada do app ou volta da rede. */
const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000;

const raiz = document.getElementById('app')!;
let app: App | undefined;
let semBase = false;
let carregando = false;
let ultimaVerificacao = 0;

const dados: OpcoesDados = {
  armazenamento: armazenamentoIndexedDB(),
  baixar: () => baixarBase(URL_DADOS),
  agora: Date.now,
  aoAtualizar: (estado, mudou) => app?.atualizar(estado, mudou),
};

function montar(estado: Parameters<typeof montarApp>[1]): void {
  app?.desmontar();
  semBase = estado.tipo === 'sem-base';
  try {
    app = montarApp(raiz, estado, { tentarNovamente: iniciar });
  } catch {
    // Nunca deixar a tela em branco: cai na tela que permite tentar de novo.
    semBase = true;
    app = montarApp(raiz, { tipo: 'sem-base' }, { tentarNovamente: iniciar });
  }
}

function iniciar(): void {
  if (carregando) return;
  carregando = true;
  ultimaVerificacao = Date.now();
  iniciarDados(dados)
    .then(montar, () => montar({ tipo: 'sem-base' }))
    .finally(() => (carregando = false));
}

/** App instalado costuma ficar dias em segundo plano: verifica de novo ao voltar. */
function aoRetomar(): void {
  if (document.visibilityState !== 'visible') return;
  app?.reavaliar();
  if (semBase) {
    if (navigator.onLine) iniciar();
    return;
  }
  if (Date.now() - ultimaVerificacao < INTERVALO_VERIFICACAO_MS) return;
  ultimaVerificacao = Date.now();
  void verificarAtualizacao(dados).finally(() => app?.reavaliar());
}

document.addEventListener('visibilitychange', aoRetomar);
window.addEventListener('online', () => {
  ultimaVerificacao = 0;
  aoRetomar();
});

iniciar();
