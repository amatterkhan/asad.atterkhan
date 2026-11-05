package server

import "sync"

const (
	// publicDownloadBytes is the shared daily budget for anonymous downloads. It is a cost backstop, far above real
	// traffic (the CDN absorbs repeats); per-client and in-memory limits stop one caller reaching it.
	publicDownloadBytes = 1024 * 1024 * 1024
	// clientDownloadBytes caps what one client (first X-Forwarded-For hop) may pull from one instance per day.
	clientDownloadBytes = 32 * 1024 * 1024
	maxTrackedClients   = 10000
)

// downloadBudget is the cheap in-memory layer in front of the Firestore quota: a client over its share, or a day
// whose shared budget is spent, is refused without a Firestore transaction.
type downloadBudget struct {
	mu        sync.Mutex
	day       string
	exhausted bool
	clients   map[string]int64
}

func (b *downloadBudget) roll() {
	if d := today(); d != b.day {
		b.day, b.exhausted, b.clients = d, false, map[string]int64{}
	}
}

// allow reserves size bytes for client, or reports that the request must be refused.
func (b *downloadBudget) allow(client string, size int64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.roll()
	if b.exhausted || b.clients[client]+size > clientDownloadBytes {
		return false
	}
	if len(b.clients) >= maxTrackedClients {
		b.clients = map[string]int64{} // bounded memory; the Firestore budget still applies
	}
	b.clients[client] += size
	return true
}

func (b *downloadBudget) exhaust() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.roll()
	b.exhausted = true
}

// publicCache is for published files. A file's bytes never change under its id (the path holds the content hash),
// so repeats are served from the CDN. Unpublishing or archiving takes up to s-maxage to reach the CDN.
const publicCache = "public, max-age=300, s-maxage=3600"
