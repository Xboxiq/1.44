// =============================================================
// Original Form facsimile (طبق الأصل) — for CS0001
// =============================================================

function OrigForm({ data, classKey, phaseKey }) {
  const ck = (v) => <span className={`origform__ck ${v ? 'is-on' : ''}`} />;
  return (
    <div className="origform">
      <div className="origform__head">
        <img src="assets/logo.png" className="origform__logo" alt="" />
        <div className="origform__heading">
          <h2>طلب عمل اشتراك جديد</h2>
          <p>الشركة العامة لتوزيع كهرباء بغداد — كهرباء الرصافة</p>
        </div>
        <div className="origform__num">
          نموذج رقم<br />
          <strong>CS0001</strong>
        </div>
      </div>

      <table>
        <tbody>
          <tr className="origform__field">
            <td>اسم المركز</td>
            <td>الرصافة — الكرادة</td>
            <td>تاريخ الطلب</td>
            <td>{data.reqDate || '__ / __ / ____'}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم المركز</td>
            <td>RS-014</td>
            <td>رقم الطلب</td>
            <td className="mono">{data.reqNumber || 'CS0001-RS014-______'}</td>
          </tr>
          <tr className="origform__field">
            <td>اسم المشترك / طالب الخدمة</td>
            <td colSpan={3}>{data.subscriberName || '________________________________________________'}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم البطاقة الموحدة / الهوية</td>
            <td colSpan={3} className="mono">{data.nationalId || '____________'}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم وصل قبض (رسوم طلب الخدمة)</td>
            <td colSpan={3} className="mono">{data.receiptInit || '__________'}</td>
          </tr>
        </tbody>
      </table>

      <h3>صنف الاشتراك المطلوب</h3>
      <div>
        {[
          ['res','منزلي'], ['com','تجاري'], ['ind','صناعي'], ['gov','حكومي'],
          ['agr','زراعي'], ['comp','مجمع سكني'], ['inv','مشروع استثماري'],
        ].map(([k,l]) => (
          <span key={k} className="origform__lbl">{ck(classKey===k)} {l}</span>
        ))}
      </div>

      <h3>قوة التغذية المطلوبة (نوع الربط)</h3>
      <div>
        <span className="origform__lbl">{ck(phaseKey==='1ph')} أحادي الطور</span>
        <span className="origform__lbl">{ck(phaseKey==='3ph')} ثلاثي الطور</span>
      </div>

      <h3>عنوان العقار / الدار / الشقة المطلوب له الخدمة</h3>
      <table>
        <tbody>
          <tr className="origform__field">
            <td>الحي</td><td>{data.neigh || ''}</td>
            <td>المحلة</td><td>{data.quarter || ''}</td>
            <td>الزقاق</td><td>{data.alley || ''}</td>
          </tr>
          <tr className="origform__field">
            <td>الترميز الجديد</td><td>{data.code || ''}</td>
            <td>دار</td><td>{data.house || ''}</td>
            <td>رقم القطعة والمقاطعة</td><td>{data.parcel || ''}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم الطابق</td><td>{data.floor || ''}</td>
            <td>رقم الشقة</td><td>{data.flat || ''}</td>
            <td>رقم بطاقة السكن</td><td>{data.houseCard || ''}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم هاتف / موبايل</td><td colSpan={3}>{data.phone || ''}</td>
            <td>GPS / نقطة دالة</td><td>{data.gps || ''}</td>
          </tr>
          <tr className="origform__field">
            <td>رقم الحساب المخصص</td><td colSpan={5} className="mono">{data.accountNo || ''}</td>
          </tr>
        </tbody>
      </table>

      <h3>الوثائق / المستمسكات المطلوبة</h3>
      <table>
        <thead>
          <tr>
            <th>#</th><th>الوثيقة</th>
            <th>منزلي</th><th>تجاري</th><th>صناعي</th><th>زراعي</th><th>حكومي</th><th>مجمع</th><th>استثماري</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {[
            { k:'id',    l:'نسخة من هوية الأحوال المدنية',                applies:['res','com','ind','agr','gov','comp','inv'] },
            { k:'house', l:'نسخة من بطاقة السكن',                         applies:['res'] },
            { k:'sukn',  l:'كتاب تأييد سكن مصدّق',                        applies:['res','comp'] },
            { k:'qsam',  l:'القسام الشرعي (عند اللزوم)',                   applies:['res','com','ind','agr','gov','comp','inv'] },
            { k:'tax',   l:'كتاب ضريبة العقار',                            applies:['com','ind','gov','inv'] },
            { k:'build', l:'إجازة البناء مصدّقة (بدل كتاب ضريبة العقار)',  applies:['com','ind','inv','comp'] },
            { k:'tabu',  l:'سند قيد التسجيل للعقار (الطابو)',              applies:['res','com','ind','agr','gov','comp','inv'] },
            { k:'neigh', l:'صورة من قائمة حساب المجاور',                  applies:['res','com','ind','agr','comp','inv'] },
            { k:'indb',  l:'كتاب التنمية الصناعية',                       applies:['ind'] },
            { k:'agrb',  l:'كتاب المضخة الزراعية',                        applies:['agr'] },
            { k:'govb',  l:'كتاب من الدائرة',                              applies:['gov'] },
            { k:'invb',  l:'إجازة الاستثمار',                              applies:['comp','inv'] },
          ].map((d, i) => (
            <tr key={d.k}>
              <td className="mono">{i+1}</td>
              <td style={{ textAlign: 'start' }}>{d.l}</td>
              {['res','com','ind','agr','gov','comp','inv'].map(c => (
                <td key={c} style={{ textAlign: 'center' }}>{d.applies.includes(c) ? ck(true) : ''}</td>
              ))}
              <td style={{ textAlign: 'center' }}>
                {ck((data.docs||{})[d.k])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginTop: 8 }}>
        <thead>
          <tr><th>الوثيقة</th><th>رقم الوثيقة</th><th>تاريخ الوثيقة</th></tr>
        </thead>
        <tbody>
          {['كتاب ضريبة العقار','كتاب التنمية الصناعية','كتاب الدائرة الحكومية','إجازة الاستثمار','القسام الشرعي'].map(d => (
            <tr key={d} className="origform__field">
              <td>{d}</td><td /><td />
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginTop: 8 }}>
        <tbody>
          <tr className="origform__field">
            <td>رقم وصل قبض (رسوم المطالبة المالية بعد الدراسة)</td>
            <td colSpan={3} className="mono">{data.receiptFinal || ''}</td>
          </tr>
        </tbody>
      </table>

      <h3>يحوّل لاستكمال الإجراءات إلى</h3>
      <div>
        {['خدمات المشتركين','الدائرة الفنية','الدائرة القانونية','الصندوق','شؤون الموظفين','إلغاء الطلب'].map(r => (
          <span key={r} className="origform__lbl">{ck((data.route||[]).includes(r))} {r}</span>
        ))}
      </div>

      <h3>إقرار وتعهّد والتزام</h3>
      <p className="origform__pledge">
        أقرّ أنا الموقّع أدناه وأتعهد والتزم لشركة توزيع الكهرباء بما يلي:
        <br /><strong>أولاً:</strong> أقرّ بعلمي وموافقتي وأنا بكامل أهليتي القانونية أن الأساس القانوني الذي ينظم علاقتي بشركة تدفّق الخير والشركة العامة لتوزيع كهرباء بغداد — كهرباء الرصافة، هي الأنظمة الصادرة عن هذه الشركة في كل ما يتعلق بشؤون الكهرباء من حيث شروط منح الاشتراكات وأصناف المساهمات والتأمينات وأية أنظمة أو لوائح أو قرارات.
        <br /><strong>ثانياً:</strong> ألتزم وأتعهد بصفة خاصة بما يلي: عدم التعرّض للتجهيزات الكهربائية الخاصة بالشركة بقصد أو بدون قصد، مباشرةً أو بالواسطة ومهما كان الغرض، وعدم العبث بها وإبلاغ الشركة فوراً عن أي عطل أو خلل. وعدم السماح لأي شخص بالتزود بالتيار الكهربائي لأي مبنى آخر باستثناء هذا البناء. وعدم التعرض لموظفي الشركة في الدخول إلى البناء في أية ساعة لأغراض الفحص الفني الدوري أو المفاجئ أو لقراءة العداد.
        <br /><strong>ثالثاً:</strong> أقرّ بأنني أُخلي مسؤولية الشركة عن أية أضرار ناجمة عن: مخالفة الالتزامات الواردة في هذا السند، أو فصل التيار نتيجة عدم الوفاء بالالتزامات المالية، أو الانقطاع الناجم عن أعمال الصيانة والتطوير أو الظروف الطارئة وقوة قهرية.
      </p>

      <div className="origform__sig">
        <div>اسم وتوقيع موظف خدمات المشتركين</div>
        <div>اسم وتوقيع مقدم الطلب</div>
        <div>اسم وتوقيع مسؤول مركز خدمات المشتركين</div>
      </div>
    </div>
  );
}

Object.assign(window, { OrigForm });
