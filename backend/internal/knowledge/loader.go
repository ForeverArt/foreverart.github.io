package knowledge

import (
	"embed"
	"io/fs"
	"os"
	"path"
	"strings"
)

//go:embed all:embed
var embedded embed.FS

type Curator struct {
	rootFS fs.FS
}

func NewCurator(knowledgeRoot string) (*Curator, error) {
	if knowledgeRoot != "" {
		return &Curator{rootFS: os.DirFS(knowledgeRoot)}, nil
	}
	sub, err := fs.Sub(embedded, "embed")
	if err != nil {
		return nil, err
	}
	return &Curator{rootFS: sub}, nil
}

func (c *Curator) Load(refs []string) (map[string]string, []string, error) {
	out := map[string]string{}
	used := make([]string, 0, len(refs))
	for _, ref := range refs {
		rel := strings.TrimPrefix(ref, "knowledge/")
		rel = path.Clean(rel)
		if strings.Contains(rel, "..") {
			continue
		}
		b, err := fs.ReadFile(c.rootFS, rel)
		if err != nil {
			continue
		}
		// Keep excerpts short for prompt budget.
		text := string(b)
		if len(text) > 1800 {
			text = text[:1800] + "\n…\n"
		}
		out[ref] = text
		used = append(used, ref)
	}
	return out, used, nil
}
