import { Pipe, PipeTransform } from '@angular/core';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

/** 1234.5 → "$ 1.234,50" */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(v: number | null | undefined): string { return fmt.format(v ?? 0).replace(/\u00a0/g, ' '); }
}

const pad = (n: number) => String(n).padStart(2, '0');
export const fdate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`; };
export const ftime = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const today = () => new Date().toISOString().slice(0, 10);

@Pipe({ name: 'fdate' }) export class FdatePipe implements PipeTransform { transform(v: string): string { return v ? fdate(v) : ''; } }
@Pipe({ name: 'ftime' }) export class FtimePipe implements PipeTransform { transform(v: string): string { return v ? ftime(v) : ''; } }
