import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { apiUrl } from '../config/site-config';
import { LoadStatus } from '../state/collection-store';
import { PaymentMethod } from '../models/order.model';
import { generateBrandRamp } from '../utils/color-ramp';

/**
 * Config de SMTP (recuperación de cuenta por mail). `password` nunca viaja del
 * backend hacia acá — sólo `passwordSet` dice si hay una guardada.
 */
export interface MailConfig {
  host: string | null;
  port: number | null;
  username: string | null;
  passwordSet: boolean;
  fromEmail: string | null;
  fromName: string | null;
}

/**
 * Credenciales de Mercado Pago DE LA TIENDA (Fase 13). `accessToken` nunca
 * viaja del backend hacia acá — sólo `accessTokenSet` dice si hay uno
 * guardado (mismo criterio que `MailConfig.passwordSet`).
 */
export interface MercadoPagoConfig {
  mpEnabled: boolean;
  accessTokenSet: boolean;
  publicKey: string | null;
}

/**
 * Credenciales de ARCA DE LA TIENDA (Fase 14) — el certificado/clave nunca
 * viajan del backend hacia acá, sólo `certificadoSet`/`clavePrivadaSet`
 * dicen si hay uno guardado (mismo criterio que `MercadoPagoConfig`).
 */
export interface ArcaConfig {
  arcaEnabled: boolean;
  /** true = homologación (testing); false = producción. */
  arcaModoPrueba: boolean;
  cuit: string | null;
  puntoVenta: number | null;
  condicionIva: string | null;
  certificadoSet: boolean;
  clavePrivadaSet: boolean;
  invoiceMode: 'TICKET_INTERNO' | 'FACTURA_ARCA';
}

export interface SiteSettings {
  storeName: string;
  whatsappNumber: string;
  aboutText: string | null;
  instagram: string | null;
  facebookUrl: string | null;
  /** Logo del negocio (URL o data URI). null = usar `LOGO_FALLBACK`. */
  logoUrl: string | null;
  /**
   * Forma en la que se recorta el logo dondequiera que se muestre (header,
   * pie de página, portada de Clásico) — `'circle'` | `'square'` | `'rectangle'`.
   */
  logoShape: string;
  /**
   * Theme visual del sitio (ver backend PLAN_SAAS.md Fase 6). Hoy sólo
   * existe `"default"` — se aplica como atributo `data-theme` en `<html>`,
   * es la base para poder ofrecer más de una apariencia sin redeploy el
   * día que haya una segunda.
   */
  theme: string;
  /**
   * Diseño de página elegido (ver backend PLAN_SAAS.md Fase 10) — eje
   * independiente de `theme`: mientras `theme` sólo cambia colores/tipografía,
   * este campo elige entre layouts realmente distintos (estructura de
   * home/catálogo). Se aplica como atributo `data-layout` en `<html>`. Hoy
   * sólo existe `"classic"`.
   */
  layout: string;
  /**
   * Color de marca elegido libremente (hex). Cuando no es null, se deriva la
   * rampa `--color-brand-50..700` (`generateBrandRamp`) y se aplica inline
   * sobre `<html>`, por encima del `[data-theme]` con nombre de `theme`. null
   * = seguir usando la paleta con nombre de siempre.
   */
  brandColor: string | null;
  /**
   * Colores independientes de `brandColor` (ver PLAN_SAAS.md Fase 10
   * ampliada) — cada uno pisa sólo su propia zona; null = seguir derivando
   * ese color de la rampa de `brandColor`/del layout, como siempre.
   */
  headerColor: string | null;
  footerColor: string | null;
  textColor: string | null;
  pageBackgroundColor: string | null;
  /** Saludo del mensaje de pedido de WhatsApp. null = `WHATSAPP_INTRO_DEFAULT`. */
  whatsappIntro: string | null;
  /** Cierre del mensaje de pedido de WhatsApp. null = `WHATSAPP_CLOSING_DEFAULT`. */
  whatsappClosing: string | null;
  /** Dirección del local (opción "Retiro en el local" del checkout). */
  storeAddress: string | null;
  /** Texto de la página "Cómo comprar" (texto libre). null = no hay página. */
  helpText: string | null;
  /** Preguntas frecuentes: bloques separados por línea en blanco (1ra línea = pregunta). */
  faqText: string | null;
  /** Un medio de pago aparece en el checkout si está habilitado Y tiene su dato. */
  paymentTransferEnabled: boolean;
  paymentTransferAlias: string | null;
  paymentQrTransferEnabled: boolean;
  paymentQrTransferImage: string | null;
  paymentQrCardEnabled: boolean;
  paymentQrCardImage: string | null;
  paymentCardLink: string | null;
  /** Habilita "efectivo al recibir/retirar". */
  paymentCashEnabled: boolean;
  /**
   * Cuenta de Cloudinary usada para subir fotos desde el panel. Sólo lectura acá
   * (se editan desde `/admin/superadmin/cloudinary`, solo superadmin — ver
   * `updateCloudinaryConfig`). null = la subida de imágenes queda deshabilitada.
   */
  cloudinaryCloudName: string | null;
  cloudinaryUploadPreset: string | null;
  /**
   * Módulos habilitados por el plan del tenant (ver backend
   * `com.saasweb.core.plan.Modules`) — hoy sólo el botón "Publicar en
   * redes" del panel de productos. `false` = no mostrarlo.
   */
  socialShareEnabled: boolean;
  /**
   * true sólo si el módulo Mercado Pago está habilitado en el plan Y la
   * tienda activó el checkout Y ya cargó su Access Token — recién ahí el
   * carrito online puede ofrecer "Pagar con Mercado Pago" (ver
   * `availablePaymentMethods` más abajo: cuando esto es true, es el ÚNICO
   * medio de pago que se ofrece en el carrito — pedido explícito del
   * usuario, para no mezclar pago validado automáticamente con medios que
   * requieren coordinar a mano por WhatsApp). No afecta "Venta en el
   * local" (`admin-pos`), que sigue ofreciendo todos los medios.
   */
  mercadoPagoAvailable: boolean;
  /**
   * Módulo `POS` habilitado en el plan (Fase 14) — el panel lo usa para
   * decidir si mostrar el punto de venta (kiosco) en el menú.
   */
  posEnabled: boolean;
  /**
   * Módulo `ECOMMERCE_SITE` habilitado en el plan (Fase 14) — un tenant sin
   * esto no tiene sitio público (el backend ya bloquea las rutas públicas);
   * el panel lo usa para no mostrar pantallas de ecommerce (Catálogo
   * online, Apariencia, Carrusel, etc.) que no aplican.
   */
  ecommerceSiteEnabled: boolean;
  /**
   * true sólo si el módulo `ARCA_INVOICING` está habilitado en el plan Y la
   * tienda cargó CUIT + certificado + punto de venta — recién ahí el punto
   * de venta puede ofrecer "Factura" real además de "Ticket".
   */
  arcaAvailable: boolean;
  /** Qué emite por defecto el punto de venta: "TICKET_INTERNO" | "FACTURA_ARCA". */
  invoiceMode: 'TICKET_INTERNO' | 'FACTURA_ARCA';
  /**
   * Condición frente al IVA de la tienda ante ARCA. El panel sólo la usa
   * para decidir si mostrar el campo de CUIT del comprador en el punto de
   * venta: con "RESPONSABLE_INSCRIPTO" se puede emitir Factura A (con CUIT)
   * o B (sin CUIT, consumidor final); con Monotributo/Exento siempre es
   * Factura C y el campo no tiene sentido.
   */
  arcaCondicionIva: string | null;
}

/** Logo por defecto (archivo estático en `public/`) si el negocio no subió uno. */
export const LOGO_FALLBACK = 'logo.jpeg';

/** Textos por defecto del mensaje de pedido de WhatsApp. Admiten {tienda} y {codigo}. */
export const WHATSAPP_INTRO_DEFAULT = '¡Hola! Quiero hacer un pedido en *{tienda}* 🧸';
export const WHATSAPP_CLOSING_DEFAULT =
  'Quedo atento/a a que me pases el alias o el link de Mercado Pago para coordinar el pago. ¡Gracias!';

/** Valores por defecto: se usan para el primer render, antes de que llegue `/api/settings`. */
const DEFAULTS: SiteSettings = {
  storeName: 'Punto de venta',
  whatsappNumber: '5491122334455',
  aboutText: '',
  instagram: '',
  facebookUrl: '',
  logoUrl: null,
  logoShape: 'circle',
  theme: 'default',
  layout: 'classic',
  brandColor: null,
  headerColor: null,
  footerColor: null,
  textColor: null,
  pageBackgroundColor: null,
  whatsappIntro: WHATSAPP_INTRO_DEFAULT,
  whatsappClosing: WHATSAPP_CLOSING_DEFAULT,
  storeAddress: null,
  helpText: null,
  faqText: null,
  paymentTransferEnabled: false,
  paymentTransferAlias: null,
  paymentQrTransferEnabled: false,
  paymentQrTransferImage: null,
  paymentQrCardEnabled: false,
  paymentQrCardImage: null,
  paymentCardLink: null,
  paymentCashEnabled: false,
  // Cuenta actual (fallback si el backend todavía no tiene la fila con estos
  // campos, ej. justo después de deployar esta migración).
  cloudinaryCloudName: 'jitutkbc',
  cloudinaryUploadPreset: 'estilospequenos',
  socialShareEnabled: true,
  mercadoPagoAvailable: false,
  posEnabled: true,
  ecommerceSiteEnabled: true,
  arcaAvailable: false,
  invoiceMode: 'TICKET_INTERNO',
  arcaCondicionIva: null,
};

/**
 * Datos del local (nombre, WhatsApp, "sobre nosotros", redes). Se editan desde
 * `/admin/config` y se guardan en el backend → cambiar el número o las redes
 * no requiere redesplegar nada.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  private readonly settingsSignal = signal<SiteSettings>(DEFAULTS);
  private readonly statusSignal = signal<LoadStatus>('idle');
  readonly saving = signal(false);

  readonly settings = this.settingsSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();

  /** Src del logo a usar: el que subió el negocio o el archivo por defecto. */
  readonly logoSrc = computed(() => this.settingsSignal().logoUrl || LOGO_FALLBACK);

  /**
   * Medios de pago que se ofrecen en el checkout ONLINE (carrito público):
   * habilitados Y con su dato cargado. Si Mercado Pago está disponible,
   * es el ÚNICO que se ofrece acá — pedido explícito del usuario, para no
   * mezclar en el mismo carrito un pago validado automáticamente con
   * medios que dependen de coordinar a mano por WhatsApp. No aplica a
   * "Venta en el local" (`admin-pos` tiene su propia lista fija, con
   * todos los medios siempre disponibles).
   */
  readonly availablePaymentMethods = computed<PaymentMethod[]>(() => {
    const s = this.settingsSignal();
    if (s.mercadoPagoAvailable) return ['MERCADOPAGO'];
    const out: PaymentMethod[] = [];
    if (s.paymentTransferEnabled && s.paymentTransferAlias?.trim()) out.push('TRANSFER');
    if (s.paymentQrTransferEnabled && s.paymentQrTransferImage) out.push('QR_TRANSFER');
    if (s.paymentQrCardEnabled && (s.paymentQrCardImage || s.paymentCardLink?.trim())) out.push('QR_CARD');
    if (s.paymentCashEnabled) out.push('CASH');
    return out;
  });

  /** true si hay cuenta de Cloudinary cargada (subida de imágenes habilitada). */
  readonly cloudinaryConfigured = computed(() => {
    const s = this.settingsSignal();
    return !!(s.cloudinaryCloudName && s.cloudinaryUploadPreset);
  });

  /** Link a wa.me con el número actual (sin mensaje). */
  readonly whatsappUrl = computed(() => `https://wa.me/${this.settingsSignal().whatsappNumber}`);
  readonly instagramUrl = computed(() => {
    const h = this.settingsSignal().instagram;
    return h ? `https://instagram.com/${h}` : null;
  });

  constructor() {
    this.applyTheme(DEFAULTS.theme);
    this.applyLayout(DEFAULTS.layout);
    this.applyBrandColor(DEFAULTS.brandColor);
    this.load();
  }

  reload = (): void => this.load();
  ensureLoaded(): void {
    if (this.statusSignal() === 'idle' || this.statusSignal() === 'error') this.load();
  }

  private load(): void {
    this.statusSignal.set('loading');
    this.http.get<SiteSettings>(apiUrl('/settings')).subscribe({
      next: (s) => {
        this.settingsSignal.set(s);
        this.statusSignal.set('loaded');
        this.applyFavicon(s.logoUrl || LOGO_FALLBACK);
        this.applyTheme(s.theme);
        this.applyLayout(s.layout);
        this.applyBrandColor(s.brandColor);
      },
      error: () => this.statusSignal.set('error'),
    });
  }

  private applyFavicon(href: string): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  /**
   * Setea `data-theme` en `<html>` para que las hojas de estilo puedan
   * reaccionar (ver `styles.css`). Hoy no hay ninguna regla que dependa de
   * este atributo todavía — es la base para cuando exista un segundo theme.
   */
  private applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme || 'default');
  }

  /**
   * Setea `data-layout` en `<html>` — eje independiente de `data-theme` (ver
   * PLAN_SAAS.md Fase 10). Hoy sólo existe el layout `"classic"`, que es el
   * único que renderiza la app; es la base para cuando exista un segundo.
   */
  private applyLayout(layout: string): void {
    document.documentElement.setAttribute('data-layout', layout || 'classic');
  }

  /**
   * Deriva la rampa `--color-brand-*` del color elegido y la aplica inline
   * sobre `<html>`, por encima de lo que haya puesto `[data-theme="x"]` en
   * `styles.css` (mismo mecanismo de override en runtime verificado en Fase
   * 6). Sin `brandColor`, saca cualquier override previo para volver a la
   * paleta con nombre de siempre.
   */
  private applyBrandColor(brandColor: string | null): void {
    const root = document.documentElement;
    const ramp = brandColor ? generateBrandRamp(brandColor) : null;
    for (const stop of ['50', '100', '200', '300', '400', '500', '600', '700'] as const) {
      const prop = `--color-brand-${stop}`;
      if (ramp) root.style.setProperty(prop, ramp[stop]);
      else root.style.removeProperty(prop);
    }
  }

  /**
   * Identidad, logo, WhatsApp, redes, textos. Sólo superadmin
   * (`PLATFORM_SETTINGS_MANAGE`). Acepta un objeto parcial: se mezcla con los
   * settings actuales antes de mandar sólo los campos de plataforma al backend.
   */
  updatePlatform(req: Partial<SiteSettings>): Observable<boolean> {
    const full: SiteSettings = { ...this.settingsSignal(), ...req };
    const {
      storeName, whatsappNumber, aboutText, instagram, facebookUrl, logoUrl, logoShape,
      whatsappIntro, whatsappClosing, storeAddress, helpText, faqText,
    } = full;
    return this.putMerged('/admin/settings/platform', {
      storeName, whatsappNumber, aboutText, instagram, facebookUrl, logoUrl, logoShape,
      whatsappIntro, whatsappClosing, storeAddress, helpText, faqText,
    });
  }

  /**
   * Diseño de página + colores (ver backend PLAN_SAAS.md Fase 10 ampliada).
   * `null` en cualquiera = volver al valor por defecto (los 4 colores
   * granulares, cuando son null, se derivan de `brandColor`/del layout).
   */
  updateAppearance(
    layout: string | null,
    brandColor: string | null,
    headerColor: string | null = null,
    footerColor: string | null = null,
    textColor: string | null = null,
    pageBackgroundColor: string | null = null
  ): Observable<boolean> {
    return this.putMerged('/admin/settings/appearance', {
      layout: layout ?? '',
      brandColor: brandColor ?? '',
      headerColor: headerColor ?? '',
      footerColor: footerColor ?? '',
      textColor: textColor ?? '',
      pageBackgroundColor: pageBackgroundColor ?? '',
    });
  }

  /** Medios de pago. Lo edita el admin normal (`PAYMENTS_MANAGE`). */
  updatePayments(req: Partial<SiteSettings>): Observable<boolean> {
    const full: SiteSettings = { ...this.settingsSignal(), ...req };
    const {
      paymentTransferEnabled, paymentTransferAlias, paymentQrTransferEnabled,
      paymentQrTransferImage, paymentQrCardEnabled, paymentQrCardImage,
      paymentCardLink, paymentCashEnabled,
    } = full;
    return this.putMerged('/admin/settings/payments', {
      paymentTransferEnabled, paymentTransferAlias, paymentQrTransferEnabled,
      paymentQrTransferImage, paymentQrCardEnabled, paymentQrCardImage,
      paymentCardLink, paymentCashEnabled,
    });
  }

  private putMerged(path: string, body: Record<string, unknown>): Observable<boolean> {
    this.saving.set(true);
    return new Observable<boolean>((sub) => {
      this.http.put<SiteSettings>(apiUrl(path), body).subscribe({
        next: (s) => {
          this.settingsSignal.set(s);
          this.statusSignal.set('loaded');
          this.applyFavicon(s.logoUrl || LOGO_FALLBACK);
          this.applyTheme(s.theme);
          this.applyLayout(s.layout);
          this.applyBrandColor(s.brandColor);
          this.saving.set(false);
          sub.next(true);
          sub.complete();
        },
        error: () => {
          this.saving.set(false);
          sub.next(false);
          sub.complete();
        },
      });
    });
  }

  /**
   * Guarda la cuenta de Cloudinary. Sólo la puede llamar un superadmin — el
   * backend devuelve 403 si no (`/admin/superadmin/cloudinary` ya valida antes
   * de mostrar el form, pero el guard de la ruta es la primera barrera).
   */
  updateCloudinaryConfig(cloudName: string | null, uploadPreset: string | null): Observable<boolean> {
    this.saving.set(true);
    return new Observable<boolean>((sub) => {
      this.http
        .put<{ cloudName: string | null; uploadPreset: string | null }>(apiUrl('/admin/settings/cloudinary'), {
          cloudName,
          uploadPreset,
        })
        .subscribe({
          next: (res) => {
            this.settingsSignal.update((s) => ({
              ...s,
              cloudinaryCloudName: res.cloudName,
              cloudinaryUploadPreset: res.uploadPreset,
            }));
            this.saving.set(false);
            sub.next(true);
            sub.complete();
          },
          error: () => {
            this.saving.set(false);
            sub.next(false);
            sub.complete();
          },
        });
    });
  }

  /** Config de SMTP. Sólo la puede leer/editar un superadmin (ver backend). */
  getMailConfig(): Observable<MailConfig | null> {
    return this.http
      .get<MailConfig>(apiUrl('/admin/settings/mail'))
      .pipe(catchError(() => of(null)));
  }

  /**
   * Guarda la config de SMTP. `password` vacío/null = no tocar la que ya está
   * guardada (mismo patrón que cambiar la contraseña de un usuario).
   */
  updateMailConfig(req: {
    host: string | null;
    port: number | null;
    username: string | null;
    password: string | null;
    fromEmail: string | null;
    fromName: string | null;
  }): Observable<MailConfig | null> {
    this.saving.set(true);
    return this.http.put<MailConfig>(apiUrl('/admin/settings/mail'), req).pipe(
      map((res) => {
        this.saving.set(false);
        return res;
      }),
      catchError(() => {
        this.saving.set(false);
        return of(null);
      })
    );
  }

  /** Credenciales de Mercado Pago de la tienda. Lo edita el admin normal (`PAYMENTS_MANAGE`). */
  getMercadoPagoConfig(): Observable<MercadoPagoConfig | null> {
    return this.http
      .get<MercadoPagoConfig>(apiUrl('/admin/settings/mercadopago'))
      .pipe(catchError(() => of(null)));
  }

  /** `accessToken` vacío/null = no tocar el que ya está guardado. */
  updateMercadoPagoConfig(req: {
    mpEnabled: boolean;
    accessToken: string | null;
    publicKey: string | null;
  }): Observable<MercadoPagoConfig | null> {
    this.saving.set(true);
    return this.http.put<MercadoPagoConfig>(apiUrl('/admin/settings/mercadopago'), req).pipe(
      map((res) => {
        this.saving.set(false);
        this.reload(); // refresca `mercadoPagoAvailable` en el settings público
        return res;
      }),
      catchError(() => {
        this.saving.set(false);
        return of(null);
      })
    );
  }

  /** Credenciales de ARCA de la tienda. Lo edita el admin normal (`PAYMENTS_MANAGE`). */
  getArcaConfig(): Observable<ArcaConfig | null> {
    return this.http.get<ArcaConfig>(apiUrl('/admin/settings/arca')).pipe(catchError(() => of(null)));
  }

  /** `certificadoPem`/`clavePrivadaPem` vacíos/null = no tocar los que ya están guardados. */
  updateArcaConfig(req: {
    arcaEnabled: boolean;
    arcaModoPrueba: boolean;
    cuit: string | null;
    puntoVenta: number | null;
    condicionIva: string | null;
    certificadoPem: string | null;
    clavePrivadaPem: string | null;
    invoiceMode: string;
  }): Observable<ArcaConfig | null> {
    this.saving.set(true);
    return this.http.put<ArcaConfig>(apiUrl('/admin/settings/arca'), req).pipe(
      map((res) => {
        this.saving.set(false);
        this.reload(); // refresca `arcaAvailable`/`invoiceMode` en el settings público
        return res;
      }),
      catchError(() => {
        this.saving.set(false);
        return of(null);
      })
    );
  }
}
