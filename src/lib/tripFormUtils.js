const DAY_ID_TO_LABEL = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الاثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
};

export function mapOperationDays(dayIds = []) {
  return dayIds.map((id) => DAY_ID_TO_LABEL[id]).filter(Boolean);
}

export function mapTripType(passengers) {
  return passengers === "group" ? "جماعي" : "فردي";
}

export function mapRouteType(routeType) {
  return routeType === "multi" ? "مسارات مختلفة" : "مسار واحد";
}

export function mapRouteDirection(direction) {
  return direction === "both" ? "ذهاب وعودة" : "ذهاب فقط";
}

export function mapSubscriptionType(subType) {
  return subType === "monthly" ? "شهري" : "مرة واحدة";
}

export function mapVehicleSize(carSize) {
  const map = { small: "صغيرة", medium: "متوسطه", large: "كبيرة" };
  return map[carSize] ?? carSize;
}

export function formatApiTime(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}

export function buildPrimaryPassenger({
  customerId,
  fullName,
  nationality,
  gender,
  phone,
  operationDays,
  fromCoords,
  toCoords,
  departureTime,
  returnTime,
  routeType,
  direction,
}) {
  const passenger = {
    customer_id: Number(customerId),
    full_name: fullName,
    nationality: nationality || "سعودي",
    gender: gender || "ذكر",
  };

  if (phone) passenger.phone = phone;

  if (routeType === "multi" || direction === "both") {
    passenger.operation_days = operationDays;
    if (fromCoords) {
      passenger.start_lat = fromCoords.lat;
      passenger.start_lng = fromCoords.lng;
    }
    if (toCoords) {
      passenger.end_lat = toCoords.lat;
      passenger.end_lng = toCoords.lng;
    }
    const dep = formatApiTime(departureTime);
    const ret = formatApiTime(returnTime);
    if (dep) passenger.departure_time = dep;
    if (ret) passenger.return_time = ret;
  }

  return passenger;
}

export function buildTripCreatePayload(form) {
  const operationDays = mapOperationDays(form.activeDays);
  const isBoth = form.direction === "both";

  const payload = {
    trip_date: form.dateFrom || new Date().toISOString().split("T")[0],
    trip_type: mapTripType(form.passengers),
    route_type: mapRouteType(form.routeType),
    route_direction: mapRouteDirection(form.direction),
    subscription_type: mapSubscriptionType(form.subType),
    trip_days_count: operationDays.length || 1,
    operation_days: operationDays,
    departure_time: formatApiTime(form.departureTime) ?? "07:00",
    return_time: isBoth ? formatApiTime(form.returnTime) : null,
    passengers_count: form.passengers === "group" ? Number(form.riderCount) || 2 : 1,
    total_price: Number(form.price) || 0,
    from: form.fromCity || "—",
    to: form.toCity || "—",
    trip_notes: form.notes || null,
    sales_ids: form.selectedSales ?? [],
    vehicle_size: mapVehicleSize(form.carSize),
  };

  if (form.fromCoords) {
    payload.start_lat = form.fromCoords.lat;
    payload.start_lng = form.fromCoords.lng;
  }
  if (form.toCoords) {
    payload.end_lat = form.toCoords.lat;
    payload.end_lng = form.toCoords.lng;
  }

  if (form.transferMethod) payload.transfer_method = form.transferMethod;
  if (form.bankName) payload.bank_name = form.bankName;
  if (form.accountNumber) payload.account_number = form.accountNumber;
  if (form.ourCommission) payload.our_commission = Number(form.ourCommission);
  if (form.commissionTransferDate) payload.commission_transfer_date = form.commissionTransferDate;
  if (form.driverGender) payload.driver_gender = form.driverGender;
  if (form.driverNat) payload.driver_nationality = form.driverNat;

  if (form.customerId && form.clientName) {
    payload["الراكب الاساسي"] = buildPrimaryPassenger({
      customerId: form.customerId,
      fullName: form.clientName,
      nationality: form.nationality,
      gender: form.clientGender,
      phone: form.clientPhone,
      operationDays,
      fromCoords: form.fromCoords,
      toCoords: form.toCoords,
      departureTime: form.departureTime,
      returnTime: form.returnTime,
      routeType: form.routeType,
      direction: form.direction,
    });
  }

  return payload;
}
