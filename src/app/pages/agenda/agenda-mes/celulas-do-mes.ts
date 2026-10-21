import { Agendamento } from '../../../services/agendamento.service';
import { corDaClinica } from '../../../shared/utils/clinic-colors';
import { formatarDataISO, formatarDataPorExtenso, parseDataISO } from '../../../shared/utils/datas';

export interface EtiquetaDaSessao {
  id: number;
  hora: string;
  nome: string;
  cor: string;
  cancelada: boolean;
  soNoDesktop: boolean;
}

export interface CelulaDoMes {
  data: string;
  dia: number;
  ehHoje: boolean;
  rotulo: string;
  etiquetas: EtiquetaDaSessao[];
  maisNoDesktop: number;
  maisNoCelular: number;
}

export interface ClinicaDaLegenda {
  id: number;
  nome: string;
  cor: string;
}

const CABEM_NO_DESKTOP = 4;
const CABEM_NO_CELULAR = 3;

function visiveis(total: number, cabem: number) {
  return total <= cabem ? total : cabem - 1;
}

function primeiroNome(nome?: string) {
  return (nome || 'Desconhecido').trim().split(/\s+/)[0];
}

function rotuloDoDia(data: string, quantidade: number, ehHoje: boolean) {
  const sessoes = quantidade === 0 ? 'nenhuma sessão' : quantidade === 1 ? '1 sessão' : `${quantidade} sessões`;
  return `${formatarDataPorExtenso(data)}${ehHoje ? ' (hoje)' : ''}: ${sessoes}`;
}

/** Células do mês de domingo a sábado; `null` = dia de outro mês, que fica vazio na grade. */
export function montarCelulasDoMes(
  mesISO: string,
  agendamentos: Agendamento[],
  hojeISO: string = formatarDataISO(),
): (CelulaDoMes | null)[] {
  const referencia = parseDataISO(mesISO);
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const porDia = new Map<string, Agendamento[]>();
  for (const agendamento of agendamentos) {
    porDia.set(agendamento.data, [...(porDia.get(agendamento.data) ?? []), agendamento]);
  }

  const celulas: (CelulaDoMes | null)[] = Array(new Date(ano, mes, 1).getDay()).fill(null);
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = formatarDataISO(new Date(ano, mes, dia));
    const sessoes = [...(porDia.get(data) ?? [])].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    const noDesktop = visiveis(sessoes.length, CABEM_NO_DESKTOP);
    const noCelular = visiveis(sessoes.length, CABEM_NO_CELULAR);
    const ehHoje = data === hojeISO;

    celulas.push({
      data,
      dia,
      ehHoje,
      rotulo: rotuloDoDia(data, sessoes.length, ehHoje),
      etiquetas: sessoes.slice(0, noDesktop).map((agendamento, indice) => ({
        id: agendamento.id,
        hora: agendamento.hora_inicio.substring(0, 5),
        nome: primeiroNome(agendamento.nome_paciente),
        cor: corDaClinica(agendamento.cor_clinica),
        cancelada: agendamento.status === 'CA',
        soNoDesktop: indice >= noCelular,
      })),
      maisNoDesktop: sessoes.length - noDesktop,
      maisNoCelular: sessoes.length - noCelular,
    });
  }

  while (celulas.length % 7) celulas.push(null);
  return celulas;
}

export function clinicasDaLegenda(agendamentos: Agendamento[]): ClinicaDaLegenda[] {
  const clinicas = new Map<number, ClinicaDaLegenda>();
  for (const agendamento of agendamentos) {
    if (!clinicas.has(agendamento.clinica)) {
      clinicas.set(agendamento.clinica, {
        id: agendamento.clinica,
        nome: agendamento.nome_clinica || '—',
        cor: corDaClinica(agendamento.cor_clinica),
      });
    }
  }
  return [...clinicas.values()];
}
