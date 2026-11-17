// --------------------------------------------------------------------------------------
// ---- TIPOS DE LO QUE MANDA LA EXTENSION A LA API ------------------------------------
// --------------------------------------------------------------------------------------

//las prioridades son las mismas que usa la extension
export type Severity = 'Alta' | 'Media' | 'Baja';
export const SEVERITIES: readonly Severity[] = ['Alta', 'Media', 'Baja'];

export interface RepoInput {
	name: string;
	remoteUrl: string; //direccion del origin sin usuario ni contrasena
}

export interface FindingInput {
	fingerprint: string; //identifica al hallazgo aunque cambie de linea (64 caracteres hexadecimales)
	file: string;
	line: number | null;
	rule: string;
	severity: Severity;
	message: string;
	suggestion: string | null;
}

//un commit analizado con todos los hallazgos que mostraba el panel en ese momento
export interface AnalysisInput {
	repo: RepoInput;
	branch: string;
	commit: { hash: string; subject: string; authorName: string; authorEmail: string };
	analyzedAt: Date;
	extensionVersion: string;
	findings: FindingInput[];
}

//aviso de que el PR de una rama se mergeo (lastCommit es el ultimo commit analizado de esa rama)
export interface MergeInput {
	repo: RepoInput;
	branch: string;
	lastCommit: string;
	mergedAt: Date;
}
