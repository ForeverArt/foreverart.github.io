// Package version holds build-time metadata injected via -ldflags.
package version

// BuildTime is set at build time via:
//
//	go build -ldflags "-X github.com/foreverart/foreverart.github.io/backend/internal/version.BuildTime=<RFC3339>"
var BuildTime = "dev"
