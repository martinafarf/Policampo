CREATE TYPE "public"."tipo_tarea" AS ENUM('siembra', 'limite_siembra', 'corte', 'no_pulverizar', 'info_floracion_cultivo', 'info_cosecha_cultivo', 'info_floracion_planta');--> statement-breakpoint
CREATE TABLE "calendario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"propuesta_id" uuid,
	"temporada_inicio" date NOT NULL,
	"temporada_fin" date NOT NULL,
	"generado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrado_en" timestamp with time zone,
	"version_reglas" text NOT NULL,
	"avisos" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendario_id" uuid NOT NULL,
	"tipo" "tipo_tarea" NOT NULL,
	"planta_nombre" text,
	"cultivo_nombre" text,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"estimada" boolean DEFAULT false NOT NULL,
	"hecha_en" date,
	"nota" text,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tarea_fechas_coherentes" CHECK ("tarea"."fecha_fin" >= "tarea"."fecha_inicio"),
	CONSTRAINT "tarea_informativa_no_marcable" CHECK ("tarea"."hecha_en" IS NULL OR "tarea"."tipo" NOT IN ('info_floracion_cultivo', 'info_cosecha_cultivo', 'info_floracion_planta')),
	CONSTRAINT "tarea_nota_largo" CHECK ("tarea"."nota" IS NULL OR length("tarea"."nota") <= 300)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "resumen_semanal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "resumen_ultimo_envio" date;--> statement-breakpoint
ALTER TABLE "calendario" ADD CONSTRAINT "calendario_establecimiento_id_establecimiento_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendario" ADD CONSTRAINT "calendario_propuesta_id_propuesta_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuesta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea" ADD CONSTRAINT "tarea_calendario_id_calendario_id_fk" FOREIGN KEY ("calendario_id") REFERENCES "public"."calendario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendario_establecimiento_generado_idx" ON "calendario" USING btree ("establecimiento_id","generado_en" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "calendario_activo_unico_por_finca_idx" ON "calendario" USING btree ("establecimiento_id") WHERE "calendario"."cerrado_en" IS NULL;--> statement-breakpoint
CREATE INDEX "tarea_calendario_fecha_idx" ON "tarea" USING btree ("calendario_id","fecha_inicio");