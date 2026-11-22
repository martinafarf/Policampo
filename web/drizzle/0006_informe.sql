CREATE TABLE "informe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"diagnostico_id" uuid,
	"propuesta_id" uuid,
	"calendario_id" uuid,
	"emitido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"incluye_nombre" boolean DEFAULT false NOT NULL,
	"version_plantilla" text NOT NULL,
	"contenido" jsonb NOT NULL,
	CONSTRAINT "informe_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "informe" ADD CONSTRAINT "informe_establecimiento_id_establecimiento_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informe" ADD CONSTRAINT "informe_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnostico"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informe" ADD CONSTRAINT "informe_propuesta_id_propuesta_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuesta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informe" ADD CONSTRAINT "informe_calendario_id_calendario_id_fk" FOREIGN KEY ("calendario_id") REFERENCES "public"."calendario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "informe_establecimiento_emitido_idx" ON "informe" USING btree ("establecimiento_id","emitido_en" desc);