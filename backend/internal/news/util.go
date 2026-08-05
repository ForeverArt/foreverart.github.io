package news

import "time"

var shanghai *time.Location

func init() {
	var err error
	shanghai, err = time.LoadLocation("Asia/Shanghai")
	if err != nil {
		// fallback to UTC+8 fixed offset
		shanghai = time.FixedZone("CST", 8*3600)
	}
}

func cst() *time.Location {
	return shanghai
}
