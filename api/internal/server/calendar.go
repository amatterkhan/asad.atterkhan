package server

import (
	"math"
	"net/http"
	"os"
	"strconv"
	"time"
	_ "time/tzdata"
)

func validDate(s string) bool {
	d, err := time.Parse("2006-01-02", s)
	return err == nil && d.Format("2006-01-02") == s
}
func mod(a, b int) int { return (a%b + b) % b }
func shift(d time.Time) string {
	anchor := time.Date(2025, 11, 24, 0, 0, 0, 0, time.UTC)
	mondayOffset := mod(int(d.Weekday())+6, 7)
	week := int(math.Floor(d.AddDate(0, 0, -mondayOffset).Sub(anchor).Hours() / 168))
	five := mod(week, 2) == 0
	day := int(d.Weekday())
	works := day == 3 || day == 4
	if five {
		works = day == 1 || day == 2 || day == 5 || day == 6 || day == 0
	}
	if !works {
		return "off"
	}
	if mod(int(math.Floor(float64(week)/4)), 2) == 0 {
		return "night"
	}
	return "day"
}
func (s *Server) calendar(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("APP_ENV") != "development" {
		s.owner(r, "calendar", false)
	}
	loc, err := time.LoadLocation("Indian/Mauritius")
	must(err)
	now := time.Now().In(loc)
	year, month := now.Year(), int(now.Month())-1
	parse := func(key string, fallback int) int {
		v, ok := r.URL.Query()[key]
		if !ok {
			return fallback
		}
		if len(v) != 1 {
			fail(400, "Invalid month")
		}
		if v[0] == "" {
			return 0 // matches Number("") in the reference implementation
		}
		f, err := strconv.ParseFloat(v[0], 64)
		if err != nil || math.IsNaN(f) || math.IsInf(f, 0) || f != math.Trunc(f) {
			fail(400, "Invalid month")
		}
		return int(f)
	}
	year = parse("year", year)
	month = parse("month", month)
	if year < 2020 || year > 2100 || month < 0 || month > 11 {
		fail(400, "Invalid month")
	}
	first := time.Date(year, time.Month(month+1), 1, 0, 0, 0, 0, time.UTC)
	cells := make([]any, mod(int(first.Weekday())+6, 7))
	for d := first; d.Month() == first.Month(); d = d.AddDate(0, 0, 1) {
		cells = append(cells, map[string]any{"day": d.Day(), "shift": shift(d), "iso": d.Format("2006-01-02")})
	}
	for len(cells)%7 != 0 {
		cells = append(cells, nil)
	}
	upcoming := []any{}
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	for i := 0; i < 14; i++ {
		d := start.AddDate(0, 0, i)
		upcoming = append(upcoming, map[string]any{"iso": d.Format("2006-01-02"), "shift": shift(d)})
	}
	jsonResponse(w, 200, map[string]any{"year": year, "month": month, "today": map[string]int{"year": now.Year(), "month": int(now.Month()) - 1, "day": now.Day()}, "cells": cells, "upcoming": upcoming})
}
