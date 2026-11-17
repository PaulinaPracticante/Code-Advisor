

-- cada repositorio que manda analisis, se identifica por la direccion de su origin
CREATE TABLE IF NOT EXISTS repos (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	name VARCHAR(200) NOT NULL,
	remote_url VARCHAR(500) COLLATE utf8mb4_bin NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	UNIQUE KEY uq_repos_remote_url (remote_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- un pull request cerrado con merge: cierra el ciclo de una rama (la misma rama se puede reutilizar para otro PR)
CREATE TABLE IF NOT EXISTS pull_requests (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	repo_id INT UNSIGNED NOT NULL,
	branch VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
	last_commit CHAR(40) COLLATE utf8mb4_bin NOT NULL,
	is_merged BIT(1) NOT NULL DEFAULT b'1',
	merged_at DATETIME(3) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	UNIQUE KEY uq_pull_requests_closure (repo_id, branch, last_commit),
	KEY idx_pull_requests_merged_at (repo_id, merged_at),
	CONSTRAINT fk_pull_requests_repo FOREIGN KEY (repo_id) REFERENCES repos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- una fila por cada commit analizado; pull_request_id queda en NULL mientras el PR esta abierto
CREATE TABLE IF NOT EXISTS analyses (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	repo_id INT UNSIGNED NOT NULL,
	branch VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
	commit_hash CHAR(40) COLLATE utf8mb4_bin NOT NULL,
	commit_subject VARCHAR(500) NOT NULL,
	author_name VARCHAR(200) NOT NULL,
	author_email VARCHAR(255) NOT NULL,
	analyzed_at DATETIME(3) NOT NULL,
	extension_version VARCHAR(40) NOT NULL,
	pull_request_id BIGINT UNSIGNED NULL,
	high_count INT UNSIGNED NOT NULL DEFAULT 0,
	medium_count INT UNSIGNED NOT NULL DEFAULT 0,
	low_count INT UNSIGNED NOT NULL DEFAULT 0,
	new_count INT UNSIGNED NOT NULL DEFAULT 0,
	resolved_count INT UNSIGNED NOT NULL DEFAULT 0,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	UNIQUE KEY uq_analyses_repo_commit (repo_id, commit_hash),
	KEY idx_analyses_cycle (repo_id, branch, pull_request_id, analyzed_at),
	KEY idx_analyses_analyzed_at (analyzed_at),
	CONSTRAINT fk_analyses_repo FOREIGN KEY (repo_id) REFERENCES repos (id),
	CONSTRAINT fk_analyses_pull_request FOREIGN KEY (pull_request_id) REFERENCES pull_requests (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- una fila por hallazgo con su vida completa: primer commit donde aparecio, ultimo donde se vio y donde se resolvio
-- (fingerprint identifica al hallazgo aunque cambie de linea). resolved_analysis_id en NULL = sigue abierto
CREATE TABLE IF NOT EXISTS findings (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	repo_id INT UNSIGNED NOT NULL,
	branch VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
	pull_request_id BIGINT UNSIGNED NULL,
	fingerprint CHAR(64) COLLATE utf8mb4_bin NOT NULL,
	file VARCHAR(500) COLLATE utf8mb4_bin NOT NULL,
	line INT UNSIGNED NULL,
	rule VARCHAR(100) NOT NULL,
	severity ENUM('Alta', 'Media', 'Baja') NOT NULL,
	message TEXT NOT NULL,
	suggestion TEXT NULL,
	first_analysis_id BIGINT UNSIGNED NOT NULL,
	last_analysis_id BIGINT UNSIGNED NOT NULL,
	resolved_analysis_id BIGINT UNSIGNED NULL,
	PRIMARY KEY (id),
	KEY idx_findings_cycle (repo_id, branch, pull_request_id, resolved_analysis_id),
	KEY idx_findings_fingerprint (repo_id, branch, fingerprint),
	KEY idx_findings_rule (rule),
	KEY idx_findings_first_analysis (first_analysis_id),
	KEY idx_findings_resolved_analysis (resolved_analysis_id),
	CONSTRAINT fk_findings_repo FOREIGN KEY (repo_id) REFERENCES repos (id),
	CONSTRAINT fk_findings_pull_request FOREIGN KEY (pull_request_id) REFERENCES pull_requests (id),
	CONSTRAINT fk_findings_first_analysis FOREIGN KEY (first_analysis_id) REFERENCES analyses (id),
	CONSTRAINT fk_findings_last_analysis FOREIGN KEY (last_analysis_id) REFERENCES analyses (id),
	CONSTRAINT fk_findings_resolved_analysis FOREIGN KEY (resolved_analysis_id) REFERENCES analyses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- un ciclo es una rama mientras su PR esta abierto (pull_request_id NULL) o un PR ya mergeado
-- resume cuantos hallazgos se detectaron, corrigieron y quedaron sin corregir en ese ciclo
CREATE OR REPLACE VIEW view_cycle_summary AS
SELECT
	a.repo_id AS repo_id,
	r.name AS repo_name,
	a.branch AS branch,
	a.pull_request_id AS pull_request_id,
	pr.merged_at AS merged_at,
	COUNT(*) AS commit_count,
	MIN(a.analyzed_at) AS first_analyzed_at,
	MAX(a.analyzed_at) AS last_analyzed_at,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id) AS detected_count,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id
			AND f.resolved_analysis_id IS NOT NULL) AS resolved_count,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id
			AND f.resolved_analysis_id IS NULL) AS unresolved_count,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id
			AND f.severity = 'Alta') AS detected_high,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id
			AND f.severity = 'Media') AS detected_medium,
	(SELECT COUNT(*) FROM findings f
		WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id
			AND f.severity = 'Baja') AS detected_low
FROM analyses a
JOIN repos r ON r.id = a.repo_id
LEFT JOIN pull_requests pr ON pr.id = a.pull_request_id
GROUP BY a.repo_id, r.name, a.branch, a.pull_request_id, pr.merged_at;

-- cada hallazgo con las fechas en que aparecio y se resolvio, base de los indicadores, el ranking de reglas y la tendencia
CREATE OR REPLACE VIEW view_finding_history AS
SELECT
	f.id AS id,
	f.repo_id AS repo_id,
	f.branch AS branch,
	f.pull_request_id AS pull_request_id,
	f.rule AS rule,
	f.severity AS severity,
	first_analysis.analyzed_at AS first_seen_at,
	resolved_analysis.analyzed_at AS resolved_at,
	pr.merged_at AS merged_at
FROM findings f
JOIN analyses first_analysis ON first_analysis.id = f.first_analysis_id
LEFT JOIN analyses resolved_analysis ON resolved_analysis.id = f.resolved_analysis_id
LEFT JOIN pull_requests pr ON pr.id = f.pull_request_id;
