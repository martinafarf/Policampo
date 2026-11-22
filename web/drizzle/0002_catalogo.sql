CREATE TYPE "public"."dependencia_polinizacion" AS ENUM('alta', 'media', 'baja', 'ninguna');--> statement-breakpoint
CREATE TYPE "public"."estado_catalogo" AS ENUM('borrador', 'publicado', 'retirado');--> statement-breakpoint
CREATE TYPE "public"."fuente_tipo" AS ENUM('bibliografia', 'entrevista', 'institucion', 'observacion_propia');--> statement-breakpoint
CREATE TYPE "public"."accion_catalogo" AS ENUM('alta', 'edicion', 'publicacion', 'retiro', 'borrado', 'importacion');--> statement-breakpoint
CREATE TYPE "public"."ciclo_planta" AS ENUM('anual', 'bianual', 'perenne');--> statement-breakpoint
CREATE TYPE "public"."entidad_catalogo" AS ENUM('planta_servicio', 'cultivo', 'compatibilidad');--> statement-breakpoint
CREATE TYPE "public"."funcion_planta" AS ENUM('atrae_polinizadores', 'control_biologico', 'cobertura_suelo', 'aporta_fertilidad', 'refugio');--> statement-breakpoint
CREATE TYPE "public"."nivel_agua" AS ENUM('baja', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."origen_planta" AS ENUM('nativa', 'introducida', 'desconocido');--> statement-breakpoint
CREATE TYPE "public"."riesgo_maleza" AS ENUM('bajo', 'medio', 'alto');--> statement-breakpoint
CREATE TABLE "cambio_catalogo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad" "entidad_catalogo" NOT NULL,
	"entidad_id" uuid NOT NULL,
	"accion" "accion_catalogo" NOT NULL,
	"administrador_id" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"antes" jsonb,
	"despues" jsonb,
	"motivo" text
);
--> statement-breakpoint
CREATE TABLE "compatibilidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cultivo_id" uuid NOT NULL,
	"planta_id" uuid NOT NULL,
	"grado" integer NOT NULL,
	"justificacion" text NOT NULL,
	"estado" "estado_catalogo" DEFAULT 'borrador' NOT NULL,
	"fuente_tipo" "fuente_tipo",
	"fuente_detalle" text,
	"validado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compatibilidad_grado_rango" CHECK ("compatibilidad"."grado" BETWEEN -5 AND 5),
	CONSTRAINT "compatibilidad_justificacion_largo" CHECK (length(btrim("compatibilidad"."justificacion")) BETWEEN 10 AND 500),
	CONSTRAINT "compatibilidad_campos_publicacion" CHECK ("compatibilidad"."estado" <> 'publicado' OR (
        "compatibilidad"."fuente_tipo" IS NOT NULL
        AND "compatibilidad"."fuente_detalle" IS NOT NULL AND length(btrim("compatibilidad"."fuente_detalle")) > 0
        AND "compatibilidad"."validado_por" IS NOT NULL AND length(btrim("compatibilidad"."validado_por")) > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "cultivo_ecorregion" (
	"cultivo_id" uuid NOT NULL,
	"ecorregion" text NOT NULL,
	"floracion_semanas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cosecha_semanas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cultivo_ecorregion_cultivo_id_ecorregion_pk" PRIMARY KEY("cultivo_id","ecorregion"),
	CONSTRAINT "cultivo_ecorregion_valida" CHECK ("cultivo_ecorregion"."ecorregion" IN ('valles_templados', 'quebrada_de_humahuaca', 'yungas', 'puna', 'chaco_seco'))
);
--> statement-breakpoint
CREATE TABLE "planta_servicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"nombre_comun" text NOT NULL,
	"nombre_cientifico" text,
	"funciones" "funcion_planta"[] NOT NULL,
	"ciclo" "ciclo_planta" NOT NULL,
	"origen" "origen_planta" DEFAULT 'desconocido' NOT NULL,
	"es_espontanea" boolean DEFAULT false NOT NULL,
	"en_mercado_local" boolean DEFAULT false NOT NULL,
	"polinizadores_que_atrae" text,
	"beneficios" text,
	"necesidad_agua" "nivel_agua" DEFAULT 'media' NOT NULL,
	"manejo_corte" text,
	"riesgo_maleza" "riesgo_maleza" DEFAULT 'bajo' NOT NULL,
	"dosis_siembra" text,
	"costo_referencia_ars_ha" numeric(12, 2),
	"costo_referencia_fecha" date,
	"estado" "estado_catalogo" DEFAULT 'borrador' NOT NULL,
	"fuente_tipo" "fuente_tipo",
	"fuente_detalle" text,
	"validado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planta_servicio_clave_unique" UNIQUE("clave"),
	CONSTRAINT "planta_servicio_clave_normalizada" CHECK ("planta_servicio"."clave" = lower(btrim("planta_servicio"."clave")) AND length("planta_servicio"."clave") > 0),
	CONSTRAINT "planta_servicio_funciones_no_vacias" CHECK (cardinality("planta_servicio"."funciones") >= 1),
	CONSTRAINT "planta_servicio_disponibilidad_local" CHECK ("planta_servicio"."es_espontanea" OR "planta_servicio"."en_mercado_local"),
	CONSTRAINT "planta_servicio_campos_publicacion" CHECK ("planta_servicio"."estado" <> 'publicado' OR (
        "planta_servicio"."nombre_cientifico" IS NOT NULL AND length(btrim("planta_servicio"."nombre_cientifico")) > 0
        AND "planta_servicio"."beneficios" IS NOT NULL AND length(btrim("planta_servicio"."beneficios")) > 0
        AND "planta_servicio"."manejo_corte" IS NOT NULL AND length(btrim("planta_servicio"."manejo_corte")) > 0
        AND "planta_servicio"."fuente_tipo" IS NOT NULL
        AND "planta_servicio"."fuente_detalle" IS NOT NULL AND length(btrim("planta_servicio"."fuente_detalle")) > 0
        AND "planta_servicio"."validado_por" IS NOT NULL AND length(btrim("planta_servicio"."validado_por")) > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "planta_servicio_ecorregion" (
	"planta_id" uuid NOT NULL,
	"ecorregion" text NOT NULL,
	"siembra_semanas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"floracion_semanas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"corte_semanas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"semanas_hasta_floracion_min" integer,
	"semanas_hasta_floracion_max" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planta_servicio_ecorregion_planta_id_ecorregion_pk" PRIMARY KEY("planta_id","ecorregion"),
	CONSTRAINT "planta_ecorregion_valida" CHECK ("planta_servicio_ecorregion"."ecorregion" IN ('valles_templados', 'quebrada_de_humahuaca', 'yungas', 'puna', 'chaco_seco')),
	CONSTRAINT "planta_semanas_floracion_coherentes" CHECK (("planta_servicio_ecorregion"."semanas_hasta_floracion_min" IS NULL OR "planta_servicio_ecorregion"."semanas_hasta_floracion_min" > 0)
      AND ("planta_servicio_ecorregion"."semanas_hasta_floracion_max" IS NULL OR "planta_servicio_ecorregion"."semanas_hasta_floracion_max" > 0)
      AND (
        "planta_servicio_ecorregion"."semanas_hasta_floracion_min" IS NULL
        OR "planta_servicio_ecorregion"."semanas_hasta_floracion_max" IS NULL
        OR "planta_servicio_ecorregion"."semanas_hasta_floracion_max" >= "planta_servicio_ecorregion"."semanas_hasta_floracion_min"
      ))
);
--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "dependencia_polinizacion" "dependencia_polinizacion";--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "tipo_polinizacion" text;--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "polinizadores_necesarios" text;--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "estado" "estado_catalogo" DEFAULT 'borrador' NOT NULL;--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "fuente_tipo" "fuente_tipo";--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "fuente_detalle" text;--> statement-breakpoint
ALTER TABLE "cultivo" ADD COLUMN "validado_por" text;--> statement-breakpoint
ALTER TABLE "cambio_catalogo" ADD CONSTRAINT "cambio_catalogo_administrador_id_user_id_fk" FOREIGN KEY ("administrador_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibilidad" ADD CONSTRAINT "compatibilidad_cultivo_id_cultivo_id_fk" FOREIGN KEY ("cultivo_id") REFERENCES "public"."cultivo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibilidad" ADD CONSTRAINT "compatibilidad_planta_id_planta_servicio_id_fk" FOREIGN KEY ("planta_id") REFERENCES "public"."planta_servicio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultivo_ecorregion" ADD CONSTRAINT "cultivo_ecorregion_cultivo_id_cultivo_id_fk" FOREIGN KEY ("cultivo_id") REFERENCES "public"."cultivo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planta_servicio_ecorregion" ADD CONSTRAINT "planta_servicio_ecorregion_planta_id_planta_servicio_id_fk" FOREIGN KEY ("planta_id") REFERENCES "public"."planta_servicio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cambio_catalogo_entidad_idx" ON "cambio_catalogo" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "cambio_catalogo_fecha_idx" ON "cambio_catalogo" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "compatibilidad_cultivo_planta_unico_idx" ON "compatibilidad" USING btree ("cultivo_id","planta_id");--> statement-breakpoint
ALTER TABLE "cultivo" ADD CONSTRAINT "cultivo_campos_publicacion" CHECK ("cultivo"."estado" <> 'publicado' OR (
        "cultivo"."dependencia_polinizacion" IS NOT NULL
        AND "cultivo"."fuente_tipo" IS NOT NULL
        AND "cultivo"."fuente_detalle" IS NOT NULL
        AND length(btrim("cultivo"."fuente_detalle")) > 0
        AND "cultivo"."validado_por" IS NOT NULL
        AND length(btrim("cultivo"."validado_por")) > 0
      ));--> statement-breakpoint
-- Datos iniciales del catálogo (especificación 03, sección 8 y CA-03-20).
-- Todo entra en estado "borrador" con su fuente, para validación de los analistas de dominio.
INSERT INTO "planta_servicio" (
	"clave", "nombre_comun", "nombre_cientifico", "funciones", "ciclo", "origen",
	"es_espontanea", "en_mercado_local", "polinizadores_que_atrae", "beneficios",
	"necesidad_agua", "manejo_corte", "riesgo_maleza", "dosis_siembra",
	"estado", "fuente_tipo", "fuente_detalle"
) VALUES
	(
		'calendula', 'Caléndula', 'Calendula officinalis',
		ARRAY['atrae_polinizadores', 'control_biologico']::"funcion_planta"[], 'anual', 'introducida',
		false, true, 'Sírfidos, crisopas, coccinélidos y abejas',
		'Atrae sírfidos, crisopas y coccinélidos predadores de pulgones y trips. Repele nemátodos del suelo y resiste frío moderado en Jujuy.',
		'baja', 'Despunte floral post-pico de floración para estimular refloración y evitar resiembra indeseada.',
		'bajo', 'Siembra directa (6–10 kg/ha)',
		'borrador', 'observacion_propia', 'Prototipos de diagnóstico y calendario (v1, a validar por analistas de dominio)'
	),
	(
		'borraja', 'Borraja', 'Borago officinalis',
		ARRAY['atrae_polinizadores']::"funcion_planta"[], 'anual', 'introducida',
		false, true, 'Abejas nativas y abejorros (Bombus)',
		'Rica fuente de néctar continuo para abejas nativas y abejorros. Fortalece la polinización del tomate.',
		'media', 'Corte a fin de ciclo para resembrar o usar como mulch y controlar semillas post-floración.',
		'medio', NULL,
		'borrador', 'observacion_propia', 'Prototipo de diagnóstico (v1, a validar por analistas de dominio)'
	),
	(
		'vicia_villosa', 'Vicia villosa', 'Vicia villosa',
		ARRAY['cobertura_suelo', 'aporta_fertilidad', 'refugio']::"funcion_planta"[], 'anual', 'introducida',
		true, true, 'Avispas parasitoides de orugas y polinizadores',
		'Fijación biológica de nitrógeno (hasta 120 kg N/ha) y refugio para avispas parasitoides de orugas.',
		'baja', 'Rolado o siega al 50–70 % de floración cuando se usa como cobertura.',
		'medio', NULL,
		'borrador', 'observacion_propia', 'Prototipo de diagnóstico y entrevista al Especialista 1 (a validar)'
	),
	(
		'trebol_blanco', 'Trébol blanco', 'Trifolium repens',
		ARRAY['cobertura_suelo', 'aporta_fertilidad', 'atrae_polinizadores']::"funcion_planta"[], 'perenne', 'introducida',
		false, true, 'Abejas y polinizadores generalistas',
		'Excelente cobertura viva que suprime malezas, frena erosión en bordes, fija nitrógeno y aporta polen.',
		'media', 'Tolerante a cortes periódicos de mantenimiento; poda baja post-verano.',
		'bajo', 'Siembra al voleo (5–8 kg/ha)',
		'borrador', 'observacion_propia', 'Prototipos de diagnóstico y calendario (v1, a validar por analistas de dominio)'
	),
	(
		'albahaca', 'Albahaca', 'Ocimum basilicum',
		ARRAY['atrae_polinizadores']::"funcion_planta"[], 'anual', 'introducida',
		false, true, 'Abejas nativas y polinizadores de verano',
		'Sostiene polinizadores en pleno verano tras el riesgo de heladas.',
		'media', 'Poda de inflorescencias pasadas al finalizar el ciclo.',
		'bajo', 'Semilla fina (2–4 kg/ha)',
		'borrador', 'observacion_propia', 'Prototipo de calendario (v1, a validar por analistas de dominio)'
	),
	(
		'lavanda', 'Lavanda', 'Lavandula angustifolia',
		ARRAY['atrae_polinizadores', 'refugio']::"funcion_planta"[], 'perenne', 'introducida',
		false, true, 'Abejorros y abejas nativas',
		'Perenne resistente a sequía; ideal para bordes multifuncionales permanentes.',
		'baja', 'Poda de limpieza post-floración para mantener vigor del borde.',
		'bajo', 'Plantín (2–3 plantas/m²)',
		'borrador', 'observacion_propia', 'Prototipo de calendario (v1, a validar por analistas de dominio)'
	),
	(
		'romero', 'Romero', 'Salvia rosmarinus',
		ARRAY['atrae_polinizadores', 'refugio']::"funcion_planta"[], 'perenne', 'introducida',
		false, true, 'Abejas nativas y abejorros en salida de invierno',
		'Floración temprana; provee néctar al salir del invierno en bordes permanentes.',
		'baja', 'Poda de formación anual tras la floración principal.',
		'bajo', 'Plantín (2–3 plantas/m²)',
		'borrador', 'observacion_propia', 'Prototipo de calendario (v1, a validar por analistas de dominio)'
	),
	(
		'mostaza_blanca', 'Mostaza blanca', 'Sinapis alba',
		ARRAY['atrae_polinizadores', 'cobertura_suelo']::"funcion_planta"[], 'anual', 'introducida',
		false, true, 'Polinizadores generalistas y sírfidos',
		'Crecimiento muy rápido; útil para siembras tardías de emergencia y cobertura rápida.',
		'baja', 'Corte obligatorio antes de la maduración de semillas para evitar que se vuelva maleza.',
		'alto', 'Siembra directa (10–15 kg/ha)',
		'borrador', 'observacion_propia', 'Prototipo de calendario (v1, a validar por analistas de dominio)'
	),
	(
		'hinojo', 'Hinojo', 'Foeniculum vulgare',
		ARRAY['atrae_polinizadores', 'control_biologico']::"funcion_planta"[], 'perenne', 'introducida',
		true, true, 'Polinizadores nativos e insectos benéficos',
		'Flora espontánea frecuente en bordes de fincas de Jujuy que se puede conservar sin costo para atraer polinizadores.',
		'baja', 'Corte antes de la semillación excesiva si avanza sobre los lotes de cultivo.',
		'medio', NULL,
		'borrador', 'entrevista', 'Entrevista al Especialista 1 (a completar períodos por ecorregión)'
	),
	(
		'perejil', 'Perejil', 'Petroselinum crispum',
		ARRAY['atrae_polinizadores', 'control_biologico']::"funcion_planta"[], 'bianual', 'introducida',
		false, true, 'Microavispas parasitoides y polinizadores pequeños',
		'Sus umbelas florales ofrecen néctar accesible para insectos benéficos y polinizadores.',
		'media', 'Corte al finalizar la floración para controlar resiembra.',
		'bajo', NULL,
		'borrador', 'entrevista', 'Entrevista al Especialista 1 (a completar períodos por ecorregión)'
	),
	(
		'trigo_sarraceno', 'Trigo sarraceno', 'Fagopyrum esculentum',
		ARRAY['atrae_polinizadores', 'cobertura_suelo']::"funcion_planta"[], 'anual', 'introducida',
		false, true, 'Polinizadores nativos y sírfidos',
		'Floración rápida y abundante con alta atracción de polinizadores e insectos benéficos.',
		'baja', 'Corte al cierre de floración antes de la formación de grano maduro.',
		'bajo', NULL,
		'borrador', 'entrevista', 'Entrevista al Especialista 1 (a completar períodos por ecorregión)'
	)
ON CONFLICT ("clave") DO NOTHING;--> statement-breakpoint
-- Períodos iniciales en Valles Templados (prototipo de calendario, ecorregión a confirmar).
INSERT INTO "planta_servicio_ecorregion" (
	"planta_id", "ecorregion", "siembra_semanas", "floracion_semanas", "corte_semanas",
	"semanas_hasta_floracion_min", "semanas_hasta_floracion_max"
)
SELECT p."id", 'valles_templados', v."siembra"::jsonb, v."floracion"::jsonb, '[]'::jsonb, v."min_sem", v."max_sem"
FROM (VALUES
	('calendula',      '[[27,35]]', '[[36,52]]',        8,  10),
	('albahaca',       '[[36,42]]', '[[45,52],[1,12]]', 8,  10),
	('lavanda',        '[[18,28]]', '[[40,52],[1,8]]',  16, 20),
	('romero',         '[[10,20]]', '[[32,48]]',        16, 24),
	('trebol_blanco',  '[[27,34]]', '[[40,52],[1,8]]',  10, 12),
	('mostaza_blanca', '[[33,39]]', '[[40,51]]',        5,  7)
) AS v("clave", "siembra", "floracion", "min_sem", "max_sem")
JOIN "planta_servicio" p ON p."clave" = v."clave"
ON CONFLICT ("planta_id", "ecorregion") DO NOTHING;--> statement-breakpoint
-- Ampliación inicial de cultivos (tomate y pimiento en borrador, desde los prototipos).
UPDATE "cultivo"
SET
	"dependencia_polinizacion" = 'alta',
	"tipo_polinizacion" = 'Entomófila por vibración (Bombus y abejas solitarias)',
	"polinizadores_necesarios" = 'Abejorros (Bombus) y abejas nativas que polinizan por vibración',
	"estado" = 'borrador',
	"fuente_tipo" = 'observacion_propia',
	"fuente_detalle" = 'Prototipos de diagnóstico y calendario (v1, a validar por analistas de dominio)'
WHERE "clave" = 'tomate' AND "dependencia_polinizacion" IS NULL;--> statement-breakpoint
UPDATE "cultivo"
SET
	"dependencia_polinizacion" = 'media',
	"tipo_polinizacion" = 'Mixta (autógama con alta respuesta entomófila)',
	"polinizadores_necesarios" = 'Abejas nativas y abejorros',
	"estado" = 'borrador',
	"fuente_tipo" = 'observacion_propia',
	"fuente_detalle" = 'Prototipos de diagnóstico y calendario (v1, a validar por analistas de dominio)'
WHERE "clave" = 'pimiento' AND "dependencia_polinizacion" IS NULL;--> statement-breakpoint
INSERT INTO "cultivo_ecorregion" ("cultivo_id", "ecorregion", "floracion_semanas", "cosecha_semanas")
SELECT c."id", 'valles_templados', v."floracion"::jsonb, v."cosecha"::jsonb
FROM (VALUES
	('tomate',   '[[40,52],[1,4]]', '[[49,52],[1,12]]'),
	('pimiento', '[[42,52],[1,4]]', '[[1,16]]')
) AS v("clave", "floracion", "cosecha")
JOIN "cultivo" c ON c."clave" = v."clave"
ON CONFLICT ("cultivo_id", "ecorregion") DO NOTHING;--> statement-breakpoint
-- Compatibilidades iniciales del prototipo de diagnóstico (en borrador).
INSERT INTO "compatibilidad" (
	"cultivo_id", "planta_id", "grado", "justificacion",
	"estado", "fuente_tipo", "fuente_detalle"
)
SELECT c."id", p."id", v."grado", v."justificacion",
	'borrador', 'observacion_propia', 'Prototipo de diagnóstico (v1, a validar por analistas de dominio)'
FROM (VALUES
	('tomate', 'calendula',     5, 'Sinergia excelente: combate trips y mosca blanca mientras aporta floración continua.'),
	('tomate', 'borraja',       5, 'Atracción directa de abejorros y abejas nativas para la polinización por vibración de flores de tomate.'),
	('tomate', 'vicia_villosa', 4, 'Aporte de nitrógeno y refugio invernal para insectos predadores beneficiosos.'),
	('tomate', 'trebol_blanco', 4, 'Protección del suelo en cabeceras de riego sin competir agresivamente por luz.')
) AS v("cultivo_clave", "planta_clave", "grado", "justificacion")
JOIN "cultivo" c ON c."clave" = v."cultivo_clave"
JOIN "planta_servicio" p ON p."clave" = v."planta_clave"
ON CONFLICT ("cultivo_id", "planta_id") DO NOTHING;
