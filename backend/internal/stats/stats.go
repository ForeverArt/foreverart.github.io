// Package stats keeps lightweight in-memory runtime metrics for the admin dashboard.
package stats

import (
	"sync"
	"sync/atomic"
	"time"
)

const recentCap = 50

// ReportRecord describes one spin-report invocation.
type ReportRecord struct {
	ReportID  string    `json:"report_id"`
	Model     string    `json:"model"`
	Status    string    `json:"status"` // success | error
	LatencyMS int64     `json:"latency_ms"`
	At        time.Time `json:"at"`
}

// Recorder is safe for concurrent use. Data is process-local and resets on restart.
type Recorder struct {
	started time.Time
	total   atomic.Uint64

	mu     sync.Mutex
	recent []ReportRecord
}

func New() *Recorder {
	return &Recorder{started: time.Now(), recent: make([]ReportRecord, 0, recentCap)}
}

// Inc counts one incoming HTTP request.
func (r *Recorder) Inc() {
	r.total.Add(1)
}

// Add appends a report invocation to the recent ring (newest first).
func (r *Recorder) Add(rec ReportRecord) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recent = append([]ReportRecord{rec}, r.recent...)
	if len(r.recent) > recentCap {
		r.recent = r.recent[:recentCap]
	}
}

// Snapshot returns total requests, uptime seconds and recent records (newest first).
func (r *Recorder) Snapshot() (total uint64, uptimeSec int, recent []ReportRecord) {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := make([]ReportRecord, len(r.recent))
	copy(cp, r.recent)
	return r.total.Load(), int(time.Since(r.started).Seconds()), cp
}
